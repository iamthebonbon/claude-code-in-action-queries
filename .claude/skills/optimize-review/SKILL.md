---
name: optimize-review
description: Scan src/queries/ for optimization issues and produce a prioritized report. Checks N+1 patterns, schema mismatches, type safety, error handling, hard-coded values, and client-side processing.
license: MIT
compatibility: Requires TypeScript project with src/queries/ and src/schema.ts
metadata:
  author: bonbon
  version: "1.0"
  generatedBy: claude-sonnet-4-6
---

Review all query files in `src/queries/` for optimization issues and produce a prioritized, actionable report.

**This skill is read-only.** It reads files and reports findings. It never modifies code unless the user explicitly asks after reviewing the report.

---

## Steps

### 1. Load Schema (ground truth)

Read `src/schema.ts` in full. Extract:

- All table names defined via `CREATE TABLE`
- All column names per table
- All indexes defined via `CREATE INDEX`

This is the reference for Schema Mismatch checks — never guess.

### 2. Read All Query Files

Read every `.ts` file under `src/queries/` in parallel. Note each file's line count.

Also read `src/main.ts` briefly to understand how the db handle is passed.

### 3. Analyze for 8 Issue Categories

For each query file, scan for the following:

#### A. Schema Mismatch (Critical)

Scan SQL string literals for table names and column names that do not appear in `src/schema.ts`.

Look for patterns like:

- `FROM <table>` / `JOIN <table>`
- `<table>.<column>` or bare column names in SELECT/WHERE/GROUP BY/ORDER BY
- Any table referenced that is not in the schema (e.g., `order_promotions`, `cart_items`, `shipping_addresses`)

Mark as **Critical** — queries referencing phantom tables/columns will fail at runtime.

#### B. N+1 Query Pattern (High)

Look for:

- A `db.all()` call followed by a loop (`.map`, `.forEach`, `for...of`) that contains another `db.get()` or `db.all()` call
- Multiple sequential `await` calls to database functions inside a loop
- Scalar subqueries in SELECT that re-scan a full table per row

Mark as **High** — causes O(N) database round-trips.

#### C. Missing Error Handling (High)

Look for:

- Callback bodies that access `row.<property>` without first checking `if (row)`
- Promise chains with no `.catch()` or `reject` calls
- `db.get()` results used directly without null guard

Mark as **High** — crashes on empty result sets.

#### D. Type Safety (Medium)

Look for:

- Functions returning `Promise<any>` or `Promise<any[]>`
- Inline `as any` casts
- Interfaces that include `[key: string]: any` catch-alls
- Functions with no explicit return type annotation

Mark as **Medium** — reduces IDE support and hides bugs.

#### E. Hard-Coded Thresholds (Medium)

Look for magic numbers embedded in SQL WHERE/HAVING clauses that should be query parameters, e.g.:

- `quantity < 20`
- `total_value > 1000`
- `LIMIT 10` without a parameter
- Date offsets like `'-7 days'` as literals

Mark as **Medium** — limits reusability and makes business rules invisible.

#### F. Client-Side Processing (Medium)

Look for:

- JavaScript `.reduce()`, `.filter()`, `.sort()`, `.map()` applied to full result sets that SQL aggregation (GROUP BY, HAVING, ORDER BY, window functions) could handle
- Manual date arithmetic in JavaScript on query results
- Average/sum/count computed in JS instead of SQL

Mark as **Medium** — wastes network/memory and loses SQL optimizer benefits.

#### G. Redundant DISTINCT + GROUP BY (Low)

Look for SQL queries that include both `DISTINCT` and `GROUP BY` on the same result set. GROUP BY already produces distinct groups; DISTINCT is redundant and adds a sort pass.

Mark as **Low** — minor performance waste.

#### H. Unindexed Filter Columns (Low)

Cross-reference WHERE/JOIN columns against indexes extracted from `src/schema.ts`. Flag columns used as filters that have no matching index.

Common patterns to check: `WHERE email =`, `WHERE status =`, `WHERE product_id =`, `WHERE customer_id =`, `ORDER BY created_at`.

Mark as **Low** — affects query performance at scale; needs schema change to fix.

---

## 4. Produce the Report

Output the report in this exact structure:

```
## Optimization Review: src/queries/

### Summary Table

| Severity | Count | Categories |
|----------|-------|------------|
| Critical |   N   | Schema Mismatch |
| High     |   N   | N+1, Error Handling |
| Medium   |   N   | Type Safety, Hard-coded, Client-side |
| Low      |   N   | DISTINCT+GROUP BY, Unindexed Filters |

---

### Critical

#### Schema Mismatch
| File | Function | Issue | Fix |
|------|----------|-------|-----|
| src/queries/X.ts:NN | functionName | Table `foo` not in schema | Replace with `bar` or add to schema |
...

---

### High

#### N+1 Query Pattern
| File | Function | Issue | Fix |
|------|----------|-------|-----|
...

#### Missing Error Handling
| File | Function | Issue | Fix |
|------|----------|-------|-----|
...

---

### Medium
[same table format per category]

---

### Low
[same table format per category]

---

### Files with No Issues
- src/queries/X.ts — clean
```

Include file:line references wherever possible (e.g., `src/queries/analytics_queries.ts:47`).

Keep each "Issue" cell to one phrase. Keep each "Fix" cell to one concrete action.

---

## 5. Offer to Fix

After the report, output exactly:

```
---
Want me to fix any of these? You can say:
- "Fix all Critical issues"
- "Fix [function name]"
- "Fix all High and Medium issues"
- Or describe what you want
```

Then wait for the user's response. Do not make any edits until the user explicitly requests them.

---

## Guardrails

- **Never modify files during the review scan** — this is a read-only analysis pass
- **Never invent findings** — every issue must be directly traceable to code read in this session
- **Use schema.ts as ground truth** for mismatch checks; don't rely on memory or training data
- **Cite actual line numbers** when possible; if uncertain, cite the function name
- **Don't suggest architectural rewrites** — keep fix suggestions scoped to the function being reviewed
- **If src/schema.ts or src/queries/ don't exist**, report that clearly and stop
