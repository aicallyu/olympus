#!/usr/bin/env node
/**
 * OLYMPUS Control System — Session Health Monitor
 * Runs every 5 minutes via cron
 * Checks: Session health, Task timeouts
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mfpyyriilflviojnqhuv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSessionHealth() {
  console.log('[Control] Checking session health...');
  
  // Find agents with 'in_progress' tasks
  const { data: activeTasks, error } = await supabase
    .from('tasks')
    .select('id, title, assigned_to, status, updated_at')
    .eq('status', 'in_progress');
  
  if (error) {
    console.error('[Control] Error fetching tasks:', error);
    return;
  }
  
  for (const task of activeTasks || []) {
    // Check if agent has active session
    const { data: session } = await supabase
      .from('agent_sessions')
      .select('*')
      .eq('agent_id', task.assigned_to)
      .eq('task_id', task.id)
      .single();
    
    if (!session) {
      // CRITICAL: No session found for in-progress task
      console.error(`[Control] CRITICAL: Task ${task.id} has no active session!`);
      
      await logControlEvent('session_health', task.assigned_to, task.id, 'critical',
        `Task "${task.title}" has status 'in_progress' but no active session found`,
        'Escalated to ARGOS for reassignment'
      );
      
      // Escalate: Reset task to 'assigned' status
      await supabase.from('tasks').update({ 
        status: 'assigned',
        updated_at: new Date().toISOString()
      }).eq('id', task.id);
      
      // Notify ARGOS (could use message tool here)
      console.error(`[Control] Task ${task.id} reset to 'assigned' — requires manual intervention`);
      continue;
    }
    
    // Check last ping time
    const lastPing = new Date(session.last_ping);
    const now = new Date();
    const minutesSincePing = (now - lastPing) / 1000 / 60;
    
    if (minutesSincePing > 15) {
      // Session stalled
      console.warn(`[Control] WARNING: Agent ${task.assigned_to} no ping for ${Math.round(minutesSincePing)} min`);
      
      await supabase.from('agent_sessions').update({
        status: 'stalled'
      }).eq('session_id', session.session_id);
      
      await logControlEvent('session_health', task.assigned_to, task.id, 'warning',
        `No heartbeat ping for ${Math.round(minutesSincePing)} minutes`,
        'Session marked as stalled'
      );
    }
    
    if (minutesSincePing > 30) {
      // Session dead
      console.error(`[Control] CRITICAL: Agent ${task.assigned_to} session DEAD`);
      
      await supabase.from('agent_sessions').update({
        status: 'dead'
      }).eq('session_id', session.session_id);
      
      await supabase.from('tasks').update({
        status: 'assigned',
        updated_at: new Date().toISOString()
      }).eq('id', task.id);
      
      await logControlEvent('session_health', task.assigned_to, task.id, 'critical',
        'Session dead — no ping for 30+ minutes',
        'Task reset to assigned, session marked dead'
      );
    }
  }
}

async function checkTaskTimeouts() {
  console.log('[Control] Checking task timeouts...');
  
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, assigned_to, status, updated_at')
    .eq('status', 'in_progress');
  
  if (error) {
    console.error('[Control] Error:', error);
    return;
  }
  
  for (const task of tasks || []) {
    const lastUpdate = new Date(task.updated_at);
    const now = new Date();
    const minutesSinceUpdate = (now - lastUpdate) / 1000 / 60;
    
    if (minutesSinceUpdate > 30) {
      console.error(`[Control] TIMEOUT: Task ${task.id} stalled for ${Math.round(minutesSinceUpdate)} min`);
      
      await supabase.from('tasks').update({
        status: 'stalled',
        updated_at: now.toISOString()
      }).eq('id', task.id);
      
      await logControlEvent('task_timeout', task.assigned_to, task.id, 'critical',
        `Task "${task.title}" no progress for ${Math.round(minutesSinceUpdate)} minutes`,
        'Task marked as stalled, requires ARGOS intervention'
      );
    }
  }
}

async function logControlEvent(checkType, agentId, taskId, severity, message, actionTaken) {
  await supabase.from('control_logs').insert({
    check_type: checkType,
    agent_id: agentId,
    task_id: taskId,
    severity,
    message,
    action_taken: actionTaken
  });
}

// Run checks
async function main() {
  console.log('[Control] Starting health check at', new Date().toISOString());
  await checkSessionHealth();
  await checkTaskTimeouts();
  console.log('[Control] Health check complete');
}

main().catch(console.error);
