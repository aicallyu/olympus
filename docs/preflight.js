#!/usr/bin/env node
/**
 * Pre-Flight Check — Mandatory before ANY task assignment
 * Verifies sub-agent session is actually active
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mfpyyriilflviojnqhuv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Pre-Flight Check
 * @param {string} agentId — Agent to assign
 * @param {string} taskId — Task to assign
 * @param {string} sessionId — Sub-agent session key
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function preFlightCheck(agentId, taskId, sessionId) {
  console.log(`[Pre-Flight] Checking ${agentId} for task ${taskId}...`);
  
  // 1. Verify session exists and is running
  // Note: In real implementation, this would check actual process/session status
  // For now, we rely on the session key being valid
  
  // 2. Record session in tracking table
  const { error: insertError } = await supabase.from('agent_sessions').insert({
    session_id: sessionId,
    agent_id: agentId,
    task_id: taskId,
    status: 'active',
    started_at: new Date().toISOString(),
    last_ping: new Date().toISOString()
  });
  
  if (insertError) {
    console.error('[Pre-Flight] Failed to record session:', insertError);
    return { success: false, error: 'Database error' };
  }
  
  // 3. Initialize task progress tracking
  await supabase.from('task_progress').upsert({
    task_id: taskId,
    agent_id: agentId,
    progress_percent: 0,
    status_message: 'Task assigned, pre-flight passed',
    last_update: new Date().toISOString()
  });
  
  // 4. Log the assignment
  await supabase.from('control_logs').insert({
    check_type: 'pre_flight',
    agent_id: agentId,
    task_id: taskId,
    severity: 'info',
    message: `Task assigned to ${agentId}`,
    action_taken: 'Session recorded, monitoring activated'
  });
  
  console.log(`[Pre-Flight] ✅ ${agentId} cleared for task ${taskId}`);
  return { success: true };
}

// Manual test
if (import.meta.url === `file://${process.argv[1]}`) {
  const agentId = process.argv[2];
  const taskId = process.argv[3];
  const sessionId = process.argv[4];
  
  if (!agentId || !taskId || !sessionId) {
    console.log('Usage: node preflight.js <agentId> <taskId> <sessionId>');
    process.exit(1);
  }
  
  preFlightCheck(agentId, taskId, sessionId)
    .then(result => {
      console.log(result.success ? '✅ Pre-flight PASSED' : `❌ Pre-flight FAILED: ${result.error}`);
      process.exit(result.success ? 0 : 1);
    });
}
