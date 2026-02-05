import { SupabaseClient } from '@supabase/supabase-js';
export declare const supabase: SupabaseClient;
export type Agent = {
    id: string;
    name: string;
    role: string;
    status: 'idle' | 'active' | 'blocked';
    current_task_id?: string;
    session_key: string;
    model_primary: string;
    model_escalation?: string;
    created_at: string;
    updated_at: string;
};
export type Task = {
    id: string;
    title: string;
    description?: string;
    status: 'inbox' | 'assigned' | 'in_progress' | 'review' | 'done' | 'blocked';
    priority: 'low' | 'normal' | 'high' | 'critical';
    assignee_id?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
};
export type Message = {
    id: string;
    task_id: string;
    from_agent_id?: string;
    content: string;
    attachments: any[];
    created_at: string;
};
export type Activity = {
    id: string;
    type: string;
    agent_id?: string;
    task_id?: string;
    message: string;
    metadata: any;
    created_at: string;
};
export type Notification = {
    id: string;
    mentioned_agent_id: string;
    task_id?: string;
    message_id?: string;
    content: string;
    delivered: boolean;
    created_at: string;
};
export type AgentActivity = {
    id: string;
    agent_id: string;
    action: string;
    type: 'task' | 'heartbeat' | 'success' | 'blocked' | 'review' | 'error';
    task_id?: string;
    metadata: any;
    created_at: string;
};
export type AgentMetric = {
    agent_id: string;
    tasks_completed: number;
    tasks_failed: number;
    avg_completion_time?: string;
    total_cost?: number;
    last_updated: string;
};
//# sourceMappingURL=client.d.ts.map