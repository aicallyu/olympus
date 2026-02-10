// ============================================================
// OLYMP — route-message Edge Function Patch
// 
// This file documents what needs to change in the existing
// route-message Edge Function to support execution payloads.
//
// The key change: when an agent's response contains a code
// block with the structured execution format, the Edge Function
// must include it in the message metadata so the DB trigger
// (fn_detect_execution_request) picks it up.
// ============================================================

/**
 * CHANGE 1: After receiving agent response, parse for execution blocks
 * 
 * Add this function to route-message/index.ts:
 */
function extractExecutionPayload(agentResponse: string): Record<string, unknown> | null {
  // Look for ```execution ... ``` blocks in agent response
  const executionBlockRegex = /```execution\s*\n([\s\S]*?)\n```/;
  const match = agentResponse.match(executionBlockRegex);
  
  if (!match) return null;
  
  try {
    const payload = JSON.parse(match[1]);
    
    // Validate basic structure
    if (payload.type && payload.payload) {
      return payload;
    }
  } catch {
    console.error('Failed to parse execution block');
  }
  
  return null;
}

/**
 * CHANGE 2: When inserting the agent's message, include execution metadata
 * 
 * In the existing code where you insert the agent's response:
 * 
 * BEFORE:
 *   await supabase.from('war_room_messages').insert({
 *     room_id,
 *     sender_type: 'agent',
 *     sender_name: agentName,
 *     content: agentResponse,
 *     metadata: { model, routing_reason }
 *   });
 * 
 * AFTER:
 */
// const executionPayload = extractExecutionPayload(agentResponse);
// 
// await supabase.from('war_room_messages').insert({
//   room_id,
//   sender_type: 'agent',
//   sender_name: agentName,
//   content: agentResponse,
//   metadata: {
//     model,
//     routing_reason,
//     ...(executionPayload ? { execution: executionPayload } : {}),
//   }
// });

/**
 * CHANGE 3: Update agent system prompts to use the execution format
 * 
 * This is already handled by the SQL migration (OLY-EXEC-001).
 * Agents will be instructed to wrap their code outputs in:
 * 
 * ```execution
 * {
 *   "type": "code_commit",
 *   "payload": {
 *     "files": [{ "path": "...", "content": "...", "action": "create" }],
 *     "branch": "feature/...",
 *     "commit_message": "feat: ..."
 *   }
 * }
 * ```
 * 
 * The Edge Function extracts this, stores it in metadata,
 * the DB trigger creates the execution_queue entry,
 * and the Execution Bridge on GMK picks it up.
 */

/**
 * ALTERNATIVE APPROACH (simpler):
 * 
 * Instead of parsing the response text, agents could include
 * the execution payload in a structured tool_use response.
 * This depends on how the Anthropic API is called in route-message.
 * 
 * If using tool_use, define a tool:
 * {
 *   name: "commit_code",
 *   description: "Commit code files to the repository",
 *   input_schema: {
 *     type: "object",
 *     properties: {
 *       files: { ... },
 *       branch: { type: "string" },
 *       commit_message: { type: "string" }
 *     }
 *   }
 * }
 * 
 * This is cleaner but requires modifying the Anthropic API call
 * to include the tool definition.
 */
