# ADR-001: Agentic Search Over RAG

**Status:** Accepted  
**Date:** 2026-02-05  
**Author:** Juan (System Architect), Claude (Co-Architect)  
**Applies to:** All OLYMPUS agents

---

## Context

As OLYMPUS grows, agents need to recall context from past tasks, decisions, and conversations. The standard approach in AI systems is RAG (Retrieval-Augmented Generation): embed documents into a vector database, then retrieve relevant chunks at query time.

**We evaluated this approach and rejected it.**

---

## Decision

OLYMPUS uses **agentic search** instead of RAG for all agent memory and context retrieval. This means agents actively read files, grep logs, and search their filesystem for context rather than querying a pre-computed vector index.

---

## Evidence

Boris Cherny (Anthropic, Claude Code team) confirmed this approach publicly:

> "Early versions of Claude Code used RAG + a local vector db, but we found pretty quickly that agentic search generally works better. It is also simpler and doesn't have the same issues around security, privacy, staleness, and reliability."
>
> — @bcherny on X, February 2026

If the team building one of the most advanced coding agents in the world abandoned RAG in favor of agentic search, the signal is clear.

---

## Why RAG Fails for Multi-Agent Systems

### Staleness
RAG embeddings are computed at indexing time. When an agent updates a file, the vector index still returns the old version until re-indexed. In a system where 7 agents write files concurrently on 5-15 minute heartbeat cycles, the index is perpetually stale.

### Sync Complexity
Keeping a vector database synchronized with a live filesystem adds an entire infrastructure layer: watchers, indexing queues, deduplication, chunk boundary management. This complexity buys nothing that `grep` and direct file reads don't already provide.

### False Relevance
Vector similarity is not the same as relevance. An embedding of "ATLAS completed LoginForm" might return chunks about "HERCULOS completed DatabaseSchema" because the semantic structure is similar. Agentic search lets the agent apply judgment about what's actually relevant.

### Cost
Embedding APIs cost money per token. Every file update triggers re-embedding. For a system generating dozens of files per day across 7 agents, embedding costs compound fast with zero benefit over direct reads.

### Security and Privacy
A centralized vector database becomes a single point of data exposure. With file-based memory, each agent only accesses its own files. No shared index means no accidental cross-agent information leakage.

---

## How OLYMPUS Memory Works Instead

Each agent maintains a structured file stack:

| File | Purpose | Update Frequency |
|------|---------|------------------|
| **SOUL.md** | Identity, capabilities, hard rules | Rarely (manual) |
| **HEARTBEAT.md** | Current task checklist | Every heartbeat cycle |
| **WORKING.md** | Active work state, current context | During task execution |
| **MEMORY.md** | Long-term knowledge, learned patterns | After significant events |
| **logs/YYYY-MM-DD.md** | Daily activity log | Continuously |

When an agent needs context, it:
1. **Reads its own MEMORY.md and WORKING.md** for immediate context
2. **Greps relevant log files** for historical information
3. **Reads other agents' public files** if cross-agent context is needed
4. **Uses the Supabase task database** for structured queries (task history, status, assignments)

This is agentic search: the agent decides what to look for, where to look, and how to interpret what it finds. No pre-computation, no stale indexes, no sync infrastructure.

---

## The Golden Rule

> "If you want to remember something, write it to a file."

This rule applies to every agent. Memory is explicit, versioned, and always current. There is no hidden state, no embedding drift, no retrieval lottery.

---

## Consequences

### Positive:
- Zero additional infrastructure (no Pinecone, Chroma, Weaviate, etc.)
- Memory is always current (read from source, not from index)
- Agents can reason about what they're searching for
- Debuggable (just read the files)
- No embedding costs

### Negative:
- Agents spend tokens reading files (but Haiku 4.5 at $0.80/M makes this negligible)
- No semantic similarity search (agents must know what to look for)
- Scales with filesystem, not with query optimization

**Trade-off accepted.** Simplicity and correctness over theoretical retrieval performance.

---

## When to Revisit

Revisit this decision if:
- Agent count exceeds 20+ and cross-agent context becomes unmanageable
- Log files grow beyond what agents can reasonably grep in a single heartbeat
- A specific use case emerges that genuinely requires semantic similarity (e.g., "find all tasks similar to this one across all agents")

Until then: files, grep, and agentic judgment.

---

> "The best retrieval system is an agent that knows where to look."
