import { BbsApp, BbsSession, BbsStorage, BbsUser } from 'bbs-sdk';
import * as ivm from 'isolated-vm';
import * as acorn from 'acorn';
import * as estraverse from 'estraverse';
import * as ESTree from 'estree';

/**
 * Interface for GitHub repository information
 */
interface GithubRepoInfo {
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
}

/**
 * Interface for app operation rate limiting
 */
interface RateLimitState {
  operations: Record<string, number[]>;
  lastWarning: number;
}

/**
 * Options for the AppSandbox
 */
interface SandboxOptions {
  appId: string;
  allowedModules?: string[];
  timeout?: number;
}

/**
 * CommandResult interface (simplified version of BBS SDK interface)
 */
interface CommandResult {
  screen: string | null;
  response: string;
  refresh: boolean;

  data?: any;
}

/**
 * Store for GitHub apps that have been loaded
 */
const githubApps: Record<
  string,
  {
    app: BbsApp;
    repoInfo: GithubRepoInfo;
    lastUpdated: Date;
    rateLimits: RateLimitState;
  }
> = {};

/**
 * Static analysis configuration
 */
const securityConfig = {
  // Maximum allowed length for various fields
  maxLengths: {
    id: 50,
    name: 100,
    description: 500,
    welcomeScreen: 10000,
    response: 10000,
  },

  // Rate limiting configuration
  rateLimiting: {
    operations: {
      getData: 100, // 100 read operations per minute
      setData: 50, // 50 write operations per minute
      deleteData: 20, // 20 delete operations per minute
      commandExecution: 30, // 30 commands per minute
      getCurrentUser: 60, // 60 user lookups per minute
      totalMemoryUsage: 50, // Maximum MB of memory usage across all instances
    },
    timeWindow: 60 * 1000, // 1 minute window
    burstWindow: 5 * 1000, // 5 second burst window
    maxBurstOperations: {
      getData: 20, // Max 20 operations in 5 seconds
      setData: 10, // Max 10 operations in 5 seconds
      deleteData: 5, // Max 5 operations in 5 seconds
    },
    cooldownPeriod: 30 * 1000, // 30 second cooldown after exceeding limits
  },

  // Sandbox configuration
  sandbox: {
    memoryLimitMB: 128, // 128MB memory limit per isolate
    timeoutMs: 5000, // 5 second timeout for script execution
    maxOldSpaceSizeMB: 100, // 100MB max old space size
    maxCpuTime: 3000, // 3000ms max CPU time (3 seconds)
    referenceGCInterval: 60000, // Garbage collect every minute
  },

  // Forbidden patterns in code
  forbiddenPatterns: {
    // Global objects that shouldn't be accessed
    globalAccess: [
      'window',
      'document',
      'location',
      'localStorage',
      'sessionStorage',
      'navigator',
      'process',
      'global',
      'globalThis',
      'constructor',
      'Buffer',
      'ArrayBuffer',
      'Int8Array',
      'Uint8Array',
      'Uint8ClampedArray',
      'Int16Array',
      'Uint16Array',
      'Int32Array',
      'Uint32Array',
      'Float32Array',
      'Float64Array',
      'BigInt64Array',
      'BigUint64Array',
    ],
    // Methods that can execute arbitrary code
    dangerousMethods: [
      'eval',
      'Function',
      'setTimeout',
      'setInterval',
      'fetch',
      'XMLHttpRequest',
      'WebSocket',
      'Worker',
      'importScripts',
      'Proxy',
      'reflect',
      'bind',
      'call',
      'apply',
      'toString',
      'constructor',
      'prototype',
      '__proto__',
      'defineProperty',
      'defineProperties',
      'getOwnPropertyDescriptor',
      'getOwnPropertyNames',
      'getPrototypeOf',
      'setPrototypeOf',
    ],
    // Modules that shouldn't be imported
    dangerousImports: [
      'fs',
      'path',
      'child_process',
      'os',
      'net',
      'dgram',
      'crypto',
      'http',
      'https',
      'vm',
      'v8',
      'worker_threads',
      'cluster',
      'inspector',
      'perf_hooks',
      'process',
      'stream',
      'tls',
      'zlib',
      'readline',
      'repl',
      'tty',
      'url',
      'util',
      'isolated-vm',
      'acorn',
      'estraverse',
    ],
    // Regex patterns to check in code
    regexPatterns: [
      // Accessing constructor or prototype
      /\.__proto__|\[['"]__proto__['"]\]|\.prototype|\[['"]prototype['"]\]/g,
      // Accessing dangerous globals
      /\bglobal\b|\bglobalThis\b|\bprocess\b|\brequire\b|\bmodule\b|\bexports\b/g,
      // String manipulation that might be used for eval
      /['"`][\s\S]*?['"`][\s\S]*?\+[\s\S]*?['"`]eval[\s\S]*?['"`]/g,
      // Potential obfuscated code
      /\\x[0-9a-f]{2}|\\u[0-9a-f]{4}/gi,
      // Potential dynamic function creation
      /new\s+Function|Function\s*\(/g,
      // Potential with statement
      /\bwith\s*\(/g,
      // Accessing window or document properties
      /\bwindow\b|\bdocument\b|\blocation\b|\bnavigator\b/g,
      // Hidden function execution
      /\)[(.]/g,
      // Accessing constructor
      /\.constructor|\['constructor'\]|\["constructor"\]/g,
      // Potential source code access attempts
      /\.toString\(\)|\[['"]toString['"]\]\(\)|\['constructor'\]\['toString'\]/g,
    ],
  },

  // Allowed modules and their mock implementations
  allowedModules: {
    lodash: {
      get: (obj: any, path: string, defaultValue?: any) => {
        const result = path.split('.').reduce((o, p) => o?.[p], obj);
        return result === undefined ? defaultValue : result;
      },
      isEqual: (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b),
      clone: (obj: any) => JSON.parse(JSON.stringify(obj)),
      cloneDeep: (obj: any) => JSON.parse(JSON.stringify(obj)),
      merge: (obj: any, ...sources: any[]) => Object.assign({}, obj, ...sources),
      pick: (obj: any, paths: string[]) => {
        const result: any = {};
        for (const path of paths) {
          if (obj[path] !== undefined) {
            result[path] = obj[path];
          }
        }
        return result;
      },
    },
    dayjs: {
      // Simple dayjs mock that just returns functions for basic date operations
      format: (date: Date, _format?: string) => date.toISOString(),
      fromNow: (date: Date) => {
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        if (diff < 60) return `${diff} seconds ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        return `${Math.floor(diff / 86400)} days ago`;
      },
    },
  },

  // Code signing (future implementation)
  codeSigning: {
    enabled: false, // Not implemented yet
    trustedPublicKeys: [],
  },
};

/**
 * Parse a GitHub URL into owner, repo, branch, and path components
 * Supports formats like:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo/tree/branch
 * - https://github.com/owner/repo/tree/branch/path/to/app
 */
export function parseGithubUrl(url: string): GithubRepoInfo | null {
  try {
    // Remove any trailing slashes
    url = url.replace(/\/+$/, '');

    // Check if it's a GitHub URL
    if (!url.includes('github.com')) {
      return null;
    }

    // Extract the parts after github.com
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    if (pathParts.length < 2) {
      return null; // Not enough parts for owner/repo
    }

    const owner = pathParts[0];
    const repo = pathParts[1];

    // Default to main branch if not specified
    let branch = 'main';
    let path = '';

    // Check if URL includes branch information
    if (pathParts.length > 3 && pathParts[2] === 'tree') {
      branch = pathParts[3];

      // If there's a path after the branch
      if (pathParts.length > 4) {
        path = pathParts.slice(4).join('/');
      }
    }

    return { owner, repo, branch, path };
  } catch (error) {
    console.error('Error parsing GitHub URL:', error);
    return null;
  }
}

/**
 * Fetch contents from a GitHub repository
 */
async function fetchGithubContents(
  repoInfo: GithubRepoInfo,
  filePath: string = ''
): Promise<string | null> {
  try {
    const { owner, repo, branch = 'main', path = '' } = repoInfo;
    const fullPath = path ? `${path}/${filePath}` : filePath;

    // Use GitHub raw content URL to fetch the file
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fullPath}`;
    console.log(`Fetching from GitHub: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error('Error fetching from GitHub:', error);
    return null;
  }
}

/**
 * Perform static analysis on code to detect potentially malicious patterns
 * @param code The JavaScript code to analyze
 * @returns Analysis result with safety status and reason
 */
function analyzeCodeForMaliciousPatterns(code: string): { safe: boolean; reason?: string } {
  try {
    // Some basic sanity checks before more expensive processing

    // Check for file size to prevent DoS
    if (code.length > 1024 * 1024) {
      // 1MB max
      return {
        safe: false,
        reason: 'Code size exceeds maximum allowed limit of 1MB',
      };
    }

    // Check for excessive lines to detect obfuscation
    const lineCount = code.split('\n').length;
    if (lineCount > 10000) {
      return {
        safe: false,
        reason: 'Code contains too many lines, possibly obfuscated',
      };
    }

    // Check for excessive nesting depth (indicator of obfuscation)
    const braceCount = (code.match(/\{/g) || []).length;
    if (braceCount > 1000) {
      return {
        safe: false,
        reason: 'Code contains excessive nesting depth, possibly obfuscated',
      };
    }

    // Check for regex patterns first (quicker than AST traversal)
    for (const pattern of securityConfig.forbiddenPatterns.regexPatterns) {
      const matches = code.match(pattern);
      if (matches && matches.length > 0) {
        return {
          safe: false,
          reason: `Code contains forbidden pattern: ${pattern.toString()} (matched: ${matches[0]})`,
        };
      }
    }

    // Check for balance in important syntax elements
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    const openBrackets = (code.match(/\[/g) || []).length;
    const closeBrackets = (code.match(/\]/g) || []).length;

    if (
      Math.abs(openParens - closeParens) > 5 ||
      Math.abs(openBraces - closeBraces) > 5 ||
      Math.abs(openBrackets - closeBrackets) > 5
    ) {
      return {
        safe: false,
        reason: 'Code contains unbalanced syntax elements, possibly malformed or obfuscated',
      };
    }

    // Parse the code into an Abstract Syntax Tree (AST)
    const ast = acorn.parse(code, {
      ecmaVersion: 2020,
      sourceType: 'module',
      allowAwaitOutsideFunction: true,
      allowImportExportEverywhere: true,
    }) as unknown as ESTree.Program;

    let isSafe = true;
    let reason = '';

    // Additional structural analysis
    let functionCount = 0;
    let deepestNesting = 0;
    let currentNesting = 0;

    // Traverse the AST to find dangerous patterns
    estraverse.traverse(ast, {
      enter(node: any) {
        // Track nesting depth
        if (
          node.type === 'BlockStatement' ||
          node.type === 'ObjectExpression' ||
          node.type === 'ArrayExpression'
        ) {
          currentNesting++;
          deepestNesting = Math.max(deepestNesting, currentNesting);
        }

        // Track function count
        if (
          node.type === 'FunctionDeclaration' ||
          node.type === 'FunctionExpression' ||
          node.type === 'ArrowFunctionExpression'
        ) {
          functionCount++;

          // Check for excessive parameters
          if (node.params && node.params.length > 20) {
            isSafe = false;
            reason = `Function has excessive parameters (${node.params.length})`;
            this.break();
          }
        }

        // Check for forbidden global access
        if (
          node.type === 'Identifier' &&
          securityConfig.forbiddenPatterns.globalAccess.includes(node.name)
        ) {
          isSafe = false;
          reason = `Unauthorized access to global object: ${node.name}`;
          this.break();
        }

        // Check for dangerous method calls
        if (
          node.type === 'CallExpression' &&
          node.callee.type === 'Identifier' &&
          securityConfig.forbiddenPatterns.dangerousMethods.includes(node.callee.name)
        ) {
          isSafe = false;
          reason = `Use of dangerous method: ${node.callee.name}`;
          this.break();
        }

        // Check for dangerous member expressions (like window.localStorage)
        if (node.type === 'MemberExpression') {
          // Direct global object access
          if (
            node.object.type === 'Identifier' &&
            securityConfig.forbiddenPatterns.globalAccess.includes(node.object.name)
          ) {
            isSafe = false;
            reason = `Unauthorized access to global object property: ${node.object.name}.${node.property.name || '?'}`;
            this.break();
          }

          // Check for nested property access that might access constructors or prototypes
          let currentObj = node.object;
          const propertyChain = node.property.name ? [node.property.name] : [];

          while (currentObj.type === 'MemberExpression') {
            if (currentObj.property.name) {
              propertyChain.unshift(currentObj.property.name);
            }
            currentObj = currentObj.object;
          }

          if (currentObj.type === 'Identifier') {
            propertyChain.unshift(currentObj.name);

            // Check for constructor or prototype chain access
            if (
              propertyChain.includes('constructor') ||
              propertyChain.includes('prototype') ||
              propertyChain.includes('__proto__')
            ) {
              isSafe = false;
              reason = `Unauthorized access to dangerous property chain: ${propertyChain.join('.')}`;
              this.break();
            }
          }
        }

        // Check for dangerous imports/requires
        if (
          node.type === 'ImportDeclaration' &&
          node.source.type === 'Literal' &&
          securityConfig.forbiddenPatterns.dangerousImports.includes(node.source.value)
        ) {
          isSafe = false;
          reason = `Import of dangerous module: ${node.source.value}`;
          this.break();
        }

        // Check for require calls
        if (
          node.type === 'CallExpression' &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          securityConfig.forbiddenPatterns.dangerousImports.includes(node.arguments[0].value)
        ) {
          isSafe = false;
          reason = `Require of dangerous module: ${node.arguments[0].value}`;
          this.break();
        }

        // Check for eval-like patterns
        if (
          node.type === 'CallExpression' &&
          node.callee.type === 'MemberExpression' &&
          node.callee.property.name === 'toString' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          node.arguments[0].value === 'Function'
        ) {
          isSafe = false;
          reason = 'Potential Function constructor access through toString method';
          this.break();
        }

        // Check for with statements
        if (node.type === 'WithStatement') {
          isSafe = false;
          reason = 'Use of with statement is forbidden for security reasons';
          this.break();
        }
      },

      leave(node: any) {
        // Decrease nesting count when leaving a block
        if (
          node.type === 'BlockStatement' ||
          node.type === 'ObjectExpression' ||
          node.type === 'ArrayExpression'
        ) {
          currentNesting--;
        }
      },
    });

    // Check structural complexity indicators
    if (isSafe && deepestNesting > 20) {
      isSafe = false;
      reason = `Code has excessive nesting depth (${deepestNesting} levels)`;
    }

    if (isSafe && functionCount > 200) {
      isSafe = false;
      reason = `Code contains too many functions (${functionCount})`;
    }

    return { safe: isSafe, reason };
  } catch (error: any) {
    console.error('Code analysis error:', error);
    return { safe: false, reason: `Code analysis failed: ${error.message}` };
  }
}

/**
 * Create a proxied storage object that enforces rate limits and data isolation
 */
function createSecureStorage(
  baseStorage: BbsStorage,
  appId: string,
  namespace: string = '',
  rateLimitState: RateLimitState
): BbsStorage {
  const getKeyPrefix = () => {
    if (namespace) {
      return `app_${appId}_${namespace}_`;
    }
    return `app_${appId}_`;
  };

  const validateData = (data: any): boolean => {
    // Don't allow functions
    if (typeof data === 'function') {
      return false;
    }

    // Check for potentially dangerous strings
    if (
      typeof data === 'string' &&
      (data.includes('function') ||
        data.includes('=>') ||
        data.includes('eval') ||
        data.includes('new Function'))
    ) {
      console.warn(`App ${appId} attempted to store potentially dangerous string data`);
      return false;
    }

    // Recursive check for objects and arrays
    if (data && typeof data === 'object') {
      if (Array.isArray(data)) {
        return data.every((item) => validateData(item));
      } else {
        return Object.values(data).every((value) => validateData(value));
      }
    }

    return true;
  };

  const checkRateLimit = (operation: string): boolean => {
    const now = Date.now();
    const limit =
      securityConfig.rateLimiting.operations[
        operation as keyof typeof securityConfig.rateLimiting.operations
      ] || 30;
    const window = securityConfig.rateLimiting.timeWindow;

    // Initialize if needed
    if (!rateLimitState.operations[operation]) {
      rateLimitState.operations[operation] = [];
    }

    // Remove timestamps outside the window
    rateLimitState.operations[operation] = rateLimitState.operations[operation].filter(
      (timestamp) => now - timestamp < window
    );

    // Check if the operation exceeds the limit
    if (rateLimitState.operations[operation].length >= limit) {
      // Only log a warning once per minute to avoid log spam
      if (now - rateLimitState.lastWarning > window) {
        console.warn(`Rate limit exceeded for app ${appId} - ${operation}`);
        rateLimitState.lastWarning = now;
      }
      return false;
    }

    // Add current timestamp to the operation log
    rateLimitState.operations[operation].push(now);
    return true;
  };

  return {
    getData: async (key: string): Promise<string | null> => {
      if (!checkRateLimit('getData')) {
        return null;
      }

      // Add prefix to ensure app can only access its own data
      const prefixedKey = getKeyPrefix() + key;
      try {
        return await baseStorage.getData(prefixedKey);
      } catch (error) {
        console.error(`Error in getData for app ${appId}, key ${key}:`, error);
        return null;
      }
    },

    setData: async (key: string, data: string): Promise<boolean> => {
      if (!checkRateLimit('setData')) {
        return false;
      }

      // Validate data safety
      if (!validateData(data)) {
        console.warn(`App ${appId} attempted to store invalid data for key ${key}`);
        return false;
      }

      // Add prefix to ensure app can only access its own data
      const prefixedKey = getKeyPrefix() + key;
      try {
        return await baseStorage.setData(prefixedKey, data);
      } catch (error) {
        console.error(`Error in setData for app ${appId}, key ${key}:`, error);
        return false;
      }
    },

    deleteData: async (key: string): Promise<boolean> => {
      if (!checkRateLimit('deleteData')) {
        return false;
      }

      // Add prefix to ensure app can only access its own data
      const prefixedKey = getKeyPrefix() + key;
      try {
        return await baseStorage.deleteData(prefixedKey);
      } catch (error) {
        console.error(`Error in deleteData for app ${appId}, key ${key}:`, error);
        return false;
      }
    },
  };
}

/**
 * Create secure service proxies for an app
 */
function createSecureServices(
  appId: string,
  baseServices: any,
  rateLimitState: RateLimitState
): any {
  return {
    // Provide a secure storage service
    storage: createSecureStorage(baseServices.storage, appId, '', rateLimitState),

    // Function to get user-specific storage
    getUserStorage: (userId: string) =>
      createSecureStorage(baseServices.storage, appId, `user_${userId}`, rateLimitState),

    // Function to get namespaced storage
    getNamespacedStorage: (namespace: string) => {
      // Sanitize namespace to prevent traversal attacks
      const safeNamespace = namespace.replace(/[^a-zA-Z0-9_-]/g, '_');
      return createSecureStorage(baseServices.storage, appId, safeNamespace, rateLimitState);
    },

    // Get current user with rate limiting
    getCurrentUser: async (session: BbsSession): Promise<BbsUser | null> => {
      if (!checkRateLimit(rateLimitState, 'getCurrentUser')) {
        return null;
      }

      try {
        return await baseServices.getCurrentUser(session);
      } catch (error) {
        console.error(`Error in getCurrentUser for app ${appId}:`, error);
        return null;
      }
    },

    // Provide safe utility functions
    utils: {
      formatDate:
        baseServices.utils?.formatDate || ((date: Date | string) => new Date(date).toISOString()),
      generateAsciiArt:
        baseServices.utils?.generateAsciiArt || ((text: string) => `### ${text} ###`),
      createSeparator:
        baseServices.utils?.createSeparator || ((char = '-', width = 80) => char.repeat(width)),
    },
  };
}

/**
 * Check rate limit for an arbitrary operation
 */
function checkRateLimit(rateLimitState: RateLimitState, operation: string): boolean {
  const now = Date.now();
  const limit =
    securityConfig.rateLimiting.operations[
      operation as keyof typeof securityConfig.rateLimiting.operations
    ] || 30;
  const window = securityConfig.rateLimiting.timeWindow;
  const burstWindow = securityConfig.rateLimiting.burstWindow;
  const maxBurst =
    securityConfig.rateLimiting.maxBurstOperations[
      operation as keyof typeof securityConfig.rateLimiting.maxBurstOperations
    ] || Math.floor(limit / 5); // Default to 20% of regular limit

  // Initialize if needed
  if (!rateLimitState.operations[operation]) {
    rateLimitState.operations[operation] = [];
  }

  // Remove timestamps outside the window
  rateLimitState.operations[operation] = rateLimitState.operations[operation].filter(
    (timestamp) => now - timestamp < window
  );

  // Check if the operation exceeds the limit
  if (rateLimitState.operations[operation].length >= limit) {
    // Only log a warning once per minute to avoid log spam
    if (now - rateLimitState.lastWarning > window) {
      console.warn(`Rate limit exceeded for operation ${operation}`);
      rateLimitState.lastWarning = now;
    }
    return false;
  }

  // Check for burst protection - count operations in the burst window
  const recentOperations = rateLimitState.operations[operation].filter(
    (timestamp) => now - timestamp < burstWindow
  );

  if (recentOperations.length >= maxBurst) {
    // Too many operations in a short period
    if (now - rateLimitState.lastWarning > burstWindow) {
      console.warn(`Burst rate limit exceeded for operation ${operation}`);
      rateLimitState.lastWarning = now;
    }
    return false;
  }

  // Add current timestamp to the operation log
  rateLimitState.operations[operation].push(now);
  return true;
}

/**
 * Execute app code in a secure sandbox
 */
async function executeSandboxedApp(appCode: string, options: SandboxOptions): Promise<any> {
  // Analyze code for malicious patterns
  const analysis = analyzeCodeForMaliciousPatterns(appCode);
  if (!analysis.safe) {
    console.error(`Security violation: ${analysis.reason}`);
    return null;
  }

  try {
    console.log(`Creating isolated VM for app ${options.appId}...`);

    // Create a new isolate with memory limits
    const isolate = new ivm.Isolate({
      memoryLimit: securityConfig.sandbox.memoryLimitMB,
      inspector: process.env.NODE_ENV === 'development',
    });

    // Set up a context in the isolate
    const context = await isolate.createContext();

    // Get a reference to the global object within the context
    const jail = context.global;

    // Create a safe console implementation that prefixes logs with app ID
    const consoleFns = {
      log: new ivm.Reference((...args: any[]) => {
        console.log(
          `[App:${options.appId}]`,
          ...args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
        );
      }),
      error: new ivm.Reference((...args: any[]) => {
        console.error(
          `[App:${options.appId}]`,
          ...args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
        );
      }),
      warn: new ivm.Reference((...args: any[]) => {
        console.warn(
          `[App:${options.appId}]`,
          ...args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
        );
      }),
      info: new ivm.Reference((...args: any[]) => {
        console.info(
          `[App:${options.appId}]`,
          ...args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
        );
      }),
    };

    // Set up the console object in the context
    await jail.set('console', consoleFns, { reference: true });

    // Set up global object (with minimal capabilities)
    await jail.set('global', jail.deref());

    // Create JSON methods (safe to use)
    await context.eval(`
      const JSON = {
        parse: ${new ivm.Reference((text: string) => {
          try {
            return JSON.parse(text);
          } catch (e) {
            return null;
          }
        })},
        stringify: ${new ivm.Reference((obj: any) => {
          try {
            return JSON.stringify(obj);
          } catch (e) {
            return '{}';
          }
        })}
      };
    `);

    // Setup a safe timer function (with rate limiting)
    const timerRefs: Set<ivm.Reference<any>> = new Set();
    const timerFn = new ivm.Reference(
      (fn: ivm.Reference<(...args: any[]) => void>, delay: number) => {
        if (delay < 100) delay = 100; // Minimum delay of 100ms
        if (delay > 30000) delay = 30000; // Maximum delay of 30s

        // Rate limit timer creation
        if (timerRefs.size >= 10) {
          return -1; // Too many timers
        }

        // Create a timeout that will call the function
        const timerId = setTimeout(() => {
          try {
            fn.apply(undefined, []);
          } catch (err) {
            console.error(`[App:${options.appId}] Timer error:`, err);
          } finally {
            timerRefs.delete(fn);
            fn.release(); // Release the reference when done
          }
        }, delay);

        // Add to our set of references
        timerRefs.add(fn);

        return timerId;
      }
    );

    // Clear all timers on context disposal
    const clearAllTimers = () => {
      for (const ref of timerRefs) {
        ref.release();
      }
      timerRefs.clear();
    };

    // Safe require function with module whitelist
    const requireFn = new ivm.Reference((moduleName: string) => {
      // Check if module is allowed
      if (
        options.allowedModules?.includes(moduleName) ||
        moduleName in securityConfig.allowedModules
      ) {
        return (
          securityConfig.allowedModules[moduleName as keyof typeof securityConfig.allowedModules] ||
          {}
        );
      }

      // Prevent requiring modules that are not explicitly allowed
      throw new Error(`Module ${moduleName} is not allowed in BBS apps`);
    });

    // Inject the safe require function
    await jail.set('require', requireFn);

    // Set up module.exports and exports
    await context.eval(`
      const module = { exports: {} };
      const exports = {};
      
      // Safe setTimeout implementation
      const setTimeout = ${timerFn};
    `);

    // Wrap the code to ensure proper exports handling
    const wrappedCode = `
      try {
        ${appCode}
        
        // Normalize exports to handle different export patterns
        if (typeof module.exports === 'object' && module.exports !== null) {
          Object.assign(exports, module.exports);
        }
        
        // Return the exports
        ({ exports, module });
      } catch (error) {
        ({ error: error.toString() });
      }
    `;

    // Compile the script
    console.log(`Compiling script for app ${options.appId}...`);
    const script = await isolate.compileScript(wrappedCode);

    // Run the script with the limiter
    console.log(`Running script for app ${options.appId}...`);
    const result = await script.run(context, {
      timeout: securityConfig.sandbox.timeoutMs,
      release: true,
    });

    // Copy the result out of the isolate
    const resultCopy = await result.copy();
    result.release();

    // Check if there was an error
    if (resultCopy.error) {
      console.error(`Error in app code for ${options.appId}:`, resultCopy.error);

      // Clean up resources
      clearAllTimers();
      timerFn.release();
      requireFn.release();

      for (const fn of Object.values(consoleFns)) {
        fn.release();
      }

      isolate.dispose();
      return null;
    }

    // Clean up resources
    console.log(`Script execution completed for app ${options.appId}. Cleaning up...`);
    clearAllTimers();
    timerFn.release();
    requireFn.release();

    for (const fn of Object.values(consoleFns)) {
      fn.release();
    }

    // Dispose of the isolate to free up memory
    isolate.dispose();

    console.log(`Successfully loaded app ${options.appId}`);

    // Return the app from exports
    return resultCopy.exports.default || resultCopy.exports;
  } catch (error) {
    console.error(`Error sandboxing app ${options.appId}:`, error);
    return null;
  }
}

/**
 * Enhanced validation for BBS apps to check for security issues
 */
function isValidBbsApp(obj: any, appId: string): obj is BbsApp {
  if (!obj) {
    console.warn(`App ${appId} validation failed: object is null or undefined`);
    return false;
  }

  // Check required properties exist with the right types
  const requiredChecks = {
    id: typeof obj.id === 'string',
    name: typeof obj.name === 'string',
    version: typeof obj.version === 'string',
    description: typeof obj.description === 'string',
    author: typeof obj.author === 'string',
    getWelcomeScreen: typeof obj.getWelcomeScreen === 'function',
    handleCommand: typeof obj.handleCommand === 'function',
    getHelp: typeof obj.getHelp === 'function',
  };

  const missingProps = Object.entries(requiredChecks)
    .filter(([_, isValid]) => !isValid)
    .map(([prop]) => prop);

  if (missingProps.length > 0) {
    console.warn(
      `App ${appId} validation failed: missing or invalid properties: ${missingProps.join(', ')}`
    );
    return false;
  }

  // Check for string length limits to prevent DoS attacks
  if (obj.id.length > securityConfig.maxLengths.id) {
    console.warn(`App ${appId} validation failed: id too long`);
    return false;
  }

  if (obj.name.length > securityConfig.maxLengths.name) {
    console.warn(`App ${appId} validation failed: name too long`);
    return false;
  }

  if (obj.description.length > securityConfig.maxLengths.description) {
    console.warn(`App ${appId} validation failed: description too long`);
    return false;
  }

  // Test app functionality with safe inputs
  try {
    // Get welcome screen and check if it's a string and not too long
    const welcome = obj.getWelcomeScreen();
    if (typeof welcome !== 'string') {
      console.warn(`App ${appId} validation failed: getWelcomeScreen did not return a string`);
      return false;
    }

    if (welcome.length > securityConfig.maxLengths.welcomeScreen) {
      console.warn(`App ${appId} validation failed: welcome screen too long`);
      return false;
    }

    // Get help text and check if it's a string
    const help = obj.getHelp(null);
    if (typeof help !== 'string') {
      console.warn(`App ${appId} validation failed: getHelp did not return a string`);
      return false;
    }

    // Test the handleCommand function with a safe command
    const testSession: BbsSession = {
      sessionId: 'test-session',
      currentArea: 'validation',
      commandHistory: [],
      data: {},
    };

    const cmdResult = obj.handleCommand(null, 'HELP', testSession);

    // Verify the command result has the correct structure
    if (
      !cmdResult ||
      typeof cmdResult.refresh !== 'boolean' ||
      typeof cmdResult.response !== 'string' ||
      (cmdResult.screen !== null && typeof cmdResult.screen !== 'string')
    ) {
      console.warn(
        `App ${appId} validation failed: handleCommand returned invalid result structure`
      );
      return false;
    }

    // Check response length to prevent DoS
    if (cmdResult.response.length > securityConfig.maxLengths.response) {
      console.warn(`App ${appId} validation failed: command response too long`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`App ${appId} validation failed with runtime error:`, error);
    return false;
  }
}

/**
 * Load an app from a GitHub repository with enhanced security
 */
export async function loadAppFromGithub(githubUrl: string, services?: any): Promise<BbsApp | null> {
  try {
    // Parse GitHub URL
    const repoInfo = parseGithubUrl(githubUrl);
    if (!repoInfo) {
      console.error('Invalid GitHub URL format');
      return null;
    }

    // Create a unique ID for this GitHub app
    const appId = `github_${repoInfo.owner}_${repoInfo.repo}${repoInfo.path ? `_${repoInfo.path.replace(/\//g, '_')}` : ''}`;

    // Check if we already have this app loaded and it's recent (less than 1 hour old)
    const existingApp = githubApps[appId];
    if (existingApp && new Date().getTime() - existingApp.lastUpdated.getTime() < 3600000) {
      console.log(`Using cached GitHub app: ${appId}`);
      return existingApp.app;
    }

    // First try to find package.json to understand the app structure
    const packageJson = await fetchGithubContents(repoInfo, 'package.json');
    let mainFile = 'index.js'; // Default main file
    let allowedModules: string[] = [];

    if (packageJson) {
      try {
        const packageData = JSON.parse(packageJson);

        // Get main file from package.json
        if (packageData.main) {
          mainFile = packageData.main;
        }

        // Extract allowed dependencies from package.json
        if (packageData.dependencies) {
          allowedModules = Object.keys(packageData.dependencies).filter(
            (dep) => !securityConfig.forbiddenPatterns.dangerousImports.includes(dep)
          );
        }
      } catch (error) {
        console.error('Error parsing package.json:', error);
      }
    }

    // Now fetch the main app file
    const appCode = await fetchGithubContents(repoInfo, mainFile);
    if (!appCode) {
      console.error(`Could not fetch main app file: ${mainFile}`);
      return null;
    }

    // Initialize rate limit state for this app
    const rateLimitState: RateLimitState = {
      operations: {},
      lastWarning: 0,
    };

    // Execute the app code in a secure sandbox
    const sandboxedApp = await executeSandboxedApp(appCode, {
      appId,
      allowedModules,
      timeout: 10000, // 10 seconds for initial loading
    });

    if (!sandboxedApp) {
      console.error(`Failed to execute GitHub app code for ${appId}`);
      return null;
    }

    // Validate that it's a valid BBS app
    if (!isValidBbsApp(sandboxedApp, appId)) {
      console.error(`Invalid BBS app format from GitHub: ${appId}`);
      return null;
    }

    // Create a secure wrapper around the app
    const secureApp: BbsApp = {
      ...sandboxedApp,
      // Override the app ID to include GitHub source info
      id: appId,
      source: githubUrl,

      // Wrap functions with extra security
      getWelcomeScreen: () => {
        try {
          const result = sandboxedApp.getWelcomeScreen();
          return typeof result === 'string' ? result : 'Error: Invalid welcome screen';
        } catch (error) {
          console.error(`Error in getWelcomeScreen for ${appId}:`, error);
          return 'Error loading welcome screen. Please report this issue.';
        }
      },

      handleCommand: (
        screenId: string | null,
        command: string,
        session: BbsSession
      ): CommandResult => {
        try {
          // Check rate limiting for command execution
          if (!checkRateLimit(rateLimitState, 'commandExecution')) {
            return {
              screen: screenId,
              response: 'Rate limit exceeded. Please try again later.',
              refresh: false,
            };
          }

          // Sanitize inputs before passing to app
          const sanitizedScreenId = screenId?.replace(/[^\w-]/g, '') || null;
          const sanitizedCommand = command.slice(0, 1000); // Limit command length

          // Execute the command
          const result = sandboxedApp.handleCommand(sanitizedScreenId, sanitizedCommand, session);

          // Validate and sanitize the result
          if (!result || typeof result !== 'object') {
            return {
              screen: screenId,
              response: 'Error: Invalid command result',
              refresh: true,
            };
          }

          return {
            screen:
              typeof result.screen === 'string' || result.screen === null
                ? result.screen
                : screenId,
            response:
              typeof result.response === 'string'
                ? result.response.slice(0, securityConfig.maxLengths.response)
                : 'Error: Invalid response',
            refresh: typeof result.refresh === 'boolean' ? result.refresh : true,
            data: result.data,
          };
        } catch (error) {
          console.error(`Error in handleCommand for ${appId}:`, error);
          return {
            screen: screenId,
            response: 'Error executing command. Please report this issue.',
            refresh: false,
          };
        }
      },

      getHelp: (screenId: string | null): string => {
        try {
          // Sanitize input
          const sanitizedScreenId = screenId?.replace(/[^\w-]/g, '') || null;

          const result = sandboxedApp.getHelp(sanitizedScreenId);
          return typeof result === 'string' ? result : 'Error: Invalid help text';
        } catch (error) {
          console.error(`Error in getHelp for ${appId}:`, error);
          return 'Error loading help. Please report this issue.';
        }
      },

      onInit: (injectedServices?: any): void => {
        try {
          // Create secure services for this app if services were provided
          const secureServices = injectedServices
            ? createSecureServices(appId, injectedServices, rateLimitState)
            : undefined;

          // Only call onInit if it exists on the original app
          if (typeof sandboxedApp.onInit === 'function') {
            sandboxedApp.onInit(secureServices);
          }
        } catch (error) {
          console.error(`Error in onInit for ${appId}:`, error);
        }
      },

      onUserEnter: (userId: string, session: BbsSession): void => {
        try {
          // Sanitize input
          const sanitizedUserId = userId.replace(/[^\w-]/g, '');

          // Only call onUserEnter if it exists on the original app
          if (typeof sandboxedApp.onUserEnter === 'function') {
            sandboxedApp.onUserEnter(sanitizedUserId, session);
          }
        } catch (error) {
          console.error(`Error in onUserEnter for ${appId}:`, error);
        }
      },

      onUserExit: (userId: string, session: BbsSession): void => {
        try {
          // Sanitize input
          const sanitizedUserId = userId.replace(/[^\w-]/g, '');

          // Only call onUserExit if it exists on the original app
          if (typeof sandboxedApp.onUserExit === 'function') {
            sandboxedApp.onUserExit(sanitizedUserId, session);
          }
        } catch (error) {
          console.error(`Error in onUserExit for ${appId}:`, error);
        }
      },
    };

    // Store in our cache
    githubApps[appId] = {
      app: secureApp,
      repoInfo,
      lastUpdated: new Date(),
      rateLimits: rateLimitState,
    };

    // Initialize the app with provided services if available
    if (services) {
      secureApp.onInit(services);
    }

    console.log(`Successfully loaded app from GitHub: ${secureApp.name} (${secureApp.id})`);
    return secureApp;
  } catch (error) {
    console.error('Error loading app from GitHub:', error);
    return null;
  }
}

/**
 * Load all previously loaded GitHub apps
 */
export async function refreshGithubApps(services?: any): Promise<BbsApp[]> {
  const refreshedApps: BbsApp[] = [];

  // Get all stored GitHub app IDs
  const appIds = Object.keys(githubApps);

  for (const appId of appIds) {
    const storedApp = githubApps[appId];
    const { repoInfo } = storedApp;

    // Reconstruct GitHub URL
    const githubUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}${repoInfo.branch && repoInfo.branch !== 'main' ? `/tree/${repoInfo.branch}` : ''}${repoInfo.path ? `/${repoInfo.path}` : ''}`;

    // Try to reload the app
    const freshApp = await loadAppFromGithub(githubUrl, services);
    if (freshApp) {
      refreshedApps.push(freshApp);
    }
  }

  return refreshedApps;
}

/**
 * Get all currently loaded GitHub apps
 */
export function getLoadedGithubApps(): BbsApp[] {
  return Object.values(githubApps).map((entry) => entry.app);
}
