# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is an e-commerce data utilities project that provides query functions for a SQLite database. The project uses TypeScript.

## Database Schema

The SQLite database contains tables for a complete e-commerce system including:

- customers, addresses, customer_segments, customer_activity_log
- products, categories, inventory, warehouses
- orders, order_items
- reviews
- promotions

See `schema.ts` for the complete database schema definition.

## Project Structure

- `src/main.ts` - Entry point (currently minimal implementation)
- `src/schema.ts` - Database schema creation functions
- `src/queries/` - Directory containing all query modules:
  - `customer_queries.ts` - Customer-related queries
  - `product_queries.ts` - Product catalog queries
  - `order_queries.ts` - Order management queries
  - `analytics_queries.ts` - Analytics and reporting queries
  - `inventory_queries.ts` - Inventory management queries
  - `promotion_queries.ts` - Promotion queries
  - `review_queries.ts` - Product review queries
  - `shipping_queries.ts` - Shipping queries
- `hooks/` - Claude Code hook scripts:
  - `read_hook.js` - PreToolUse security hook (blocks `.env` and `.git` access)
  - `query_hook.js` - PreToolUse duplicate-query detector for `src/queries/` (currently disabled)
  - `tsc.js` - PostToolUse TypeScript type checker
- `.claude/settings.local.json` - Active hook configuration

## Development Commands

```bash
# Install dependencies
npm run setup
```

## Working with Queries

All query functions return Promises and follow these patterns:

- Single record queries use `db.get()`
- Multiple record queries use `db.all()`
- Use parameterized queries to prevent SQL injection
- Handle errors by rejecting the Promise

Example query pattern:

```typescript
export function getCustomerByEmail(db: Database, email: string): Promise<any> {
  const query = `SELECT * FROM customers WHERE email = ?`;
  return new Promise((resolve, reject) => {
    db.get(query, [email], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}
```

## Hooks & Automation

Hook scripts in `hooks/` run automatically via `.claude/settings.local.json`:

**read_hook.js** (PreToolUse: `Read | Bash`)

- Blocks any `Read` call targeting a `.env` file
- Blocks any `Bash` command referencing `.env` or `.git/`
- Hard-blocks with exit code 2 — not advisory

**query_hook.js** (PreToolUse: `Write | Edit | MultiEdit`)

- Targets files inside `src/queries/`
- Uses `@anthropic-ai/claude-agent-sdk` to detect duplicate query functions
- Currently disabled (`process.exit(0)` at the top of `main()`)

**tsc.js** (PostToolUse: `Write | Edit | MultiEdit`)

- Runs on any `.ts`/`.tsx` file after a write
- Executes `tsc --noEmit` against `tsconfig.json`
- Exits with code 2 if type errors are found, blocking the operation

## Critical Guidance

- Critical: All database queries must be written in the ./src/queries dir
- Critical: `.env` and `.git/` are off-limits — the `read_hook` hard-blocks any attempt to read them
