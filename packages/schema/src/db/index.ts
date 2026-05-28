/**
 * Drizzle schema barrel.
 *
 * Importing `@synapse/schema/db` gives every table plus row types. The
 * Better-Auth adapter expects all four auth tables to be exported from the
 * same module path.
 */
export * from './auth.js';
export * from './workspace.js';
export * from './block.js';
