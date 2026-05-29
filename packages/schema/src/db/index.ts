/**
 * Drizzle schema barrel.
 *
 * Importing `@synapse/schema/db` gives every table plus row types. The
 * Better-Auth adapter expects all four auth tables to be exported from the
 * same module path.
 */
export * from './auth.js';
export * from './workspace.js';
export * from './invitation.js';
export * from './block.js';
export * from './yjs.js';
export * from './mcp.js';
export * from './cc.js';
export * from './sequence.js';
export * from './dependency.js';
export * from './notification.js';
export * from './reaction.js';
export * from './push-subscription.js';
export * from './notification-channel.js';
