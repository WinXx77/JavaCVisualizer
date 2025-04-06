const express = require('express');
const fs = require('fs').promises;
const { createReadStream } = require('fs');
const { exec } = require('child_process');
const path = require('path');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const TEMP_DIR = path.join(__dirname, 'temp');

// Cached svg-term path to avoid repeated system calls
let svgTermPath = null;

// Middleware setup
app.use(express.json({ limit: '1mb' }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: 'Too many requests from this IP, please try again later.',
  })
);

// Ensure base temp directory exists
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create temp directory:', e.message);
  }
}

// Transform user's recursive Java code into a visualized version
function transformJavaCode(inputCode, options = { sleep: 600 }) {
  const match = inputCode.match(/int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/);
  if (!match) throw new Error('No valid recursive int method found in the input code.');
  const functionName = match[1];
  const param = match[2];

  return `
public class Main {
    public static int ${functionName}(int ${param}, int depth) throws InterruptedException {
        String indent = "  ".repeat(depth);
        String treeIndent = "| ".repeat(depth);

        // Entry visualization
        System.out.println(indent + "╔════════════════════════════════════╗");
        System.out.println(indent + "║ [+] CALL: ${functionName}(" + ${param} + ")  [Depth: " + depth + "]      ║");
        System.out.println(indent + "╚════════════════════════════════════╝");
        Thread.sleep(${options.sleep});

        // Stack and memory state
        System.out.println(indent + treeIndent + "├── Stack Push: ${functionName}(" + ${param} + ")");
        System.out.println(indent + treeIndent + "│   Memory: ${param} = " + ${param});
        Thread.sleep(${options.sleep / 2});

        if (${param} == 0) {
            System.out.println(indent + treeIndent + "├── [BASE CASE]");
            System.out.println(indent + treeIndent + "│   Condition: " + ${param} + " == 0");
            Thread.sleep(${options.sleep / 2});
            System.out.println(indent + treeIndent + "│   Action: Returning 1");
            Thread.sleep(${options.sleep / 2});
            System.out.println(indent + "╔════════════════════════════════════╗");
            System.out.println(indent + "║ [-] RETURN: 1 from ${functionName}(0)         ║");
            System.out.println(indent + "╚════════════════════════════════════╝");
            Thread.sleep(${options.sleep});
            return 1;
        }

        int nextParam = ${param} - 1;
        System.out.println(indent + treeIndent + "├── Compute: " + ${param} + " * ${functionName}(" + nextParam + ")");
        Thread.sleep(${options.sleep / 2});
        System.out.println(indent + treeIndent + "└── Diving into ${functionName}(" + nextParam + ") --->");
        Thread.sleep(${options.sleep});

        int result = ${functionName}(nextParam, depth + 1);

        // Return visualization
        System.out.println(indent + treeIndent + "┌── Returned: " + result + " from ${functionName}(" + nextParam + ")");
        Thread.sleep(${options.sleep / 2});
        System.out.println(indent + treeIndent + "├── Result: " + ${param} + " * " + result + " = " + (${param} * result));
        System.out.println(indent + treeIndent + "│   Memory Updated: ${param} = " + (${param} * result));
        Thread.sleep(${options.sleep / 2});
        System.out.println(indent + "╔════════════════════════════════════╗");
        System.out.println(indent + "║ [-] RETURN: " + (${param} * result) + " from ${functionName}(" + ${param} + ")  ║");
        System.out.println(indent + "╚════════════════════════════════════╝");
        Thread.sleep(${options.sleep});

        return ${param} * result;
    }

    public static void main(String[] args) throws InterruptedException {
        int input = 3;
        System.out.println("╔════════════════════════════════════════════════════╗");
        System.out.println("║       ULTIMATE RECURSION VISUALIZER                ║");
        System.out.println("║       Tracing ${functionName}(" + input + ")                    ║");
        System.out.println("╚════════════════════════════════════════════════════╝");
        Thread.sleep(1000);
        System.out.println(">>> STARTING EXECUTION <<<");
        Thread.sleep(500);

        int result = ${functionName}(input, 0);

        Thread.sleep(500);
        System.out.println(">>> EXECUTION COMPLETE <<<");
        System.out.println("╔════════════════════════════════════════════════════╗");
        System.out.println("║       FINAL RESULT: " + result + "                           ║");
        System.out.println("╚════════════════════════════════════════════════════╝");
    }
}
`.trim();
}

// POST endpoint: transforms code, compiles, runs, and streams SVG
app.post('/transform-run', async (req, res) => {
  const timestamp = Date.now();
  const requestTempDir = path.join(TEMP_DIR, `request-${timestamp}`);
  const filePath = path.join(requestTempDir, 'Main.java'); // Fixed file name
  const asciinemaFile = path.join(requestTempDir, `session-${timestamp}.cast`);
  const svgFile = path.join(requestTempDir, `output-${timestamp}.svg`);

  try {
    // Create a unique temp directory for this request
    await fs.mkdir(requestTempDir, { recursive: true });

    // Validate and extract request body
    const { code, options } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).send("Invalid input: 'code' must be a non-empty string.");
    }

    // Transform code with user options
    const transformedCode = transformJavaCode(code, options);
    await fs.writeFile(filePath, transformedCode, 'utf8');

    // Cache svg-term path if not already set
    if (!svgTermPath) {
      svgTermPath = (await execPromise('which svg-term')).trim();
    }

    // Compile Java code
    await execPromise(`javac -encoding UTF-8 ${filePath}`, { timeout: 10000 });

    // Record execution with asciinema
    await execPromise(
      `TERM=xterm asciinema rec -y --stdin --command="java -cp ${requestTempDir} Main" ${asciinemaFile}`,
      { timeout: 30000 }
    );

    // Convert to SVG
    await execPromise(`${svgTermPath} --in ${asciinemaFile} --out ${svgFile} --window --no-cursor`, {
      timeout: 10000,
    });

    // Stream SVG response
    res.setHeader('Content-Type', 'image/svg+xml');
    createReadStream(svgFile).pipe(res).on('error', (e) => {
      res.status(500).send(`Streaming error: ${e.message}`);
    });
  } catch (e) {
    res.status(500).send(`Error: ${e.message}`);
  } finally {
    // Cleanup: remove the entire request-specific temp directory
    await fs.rm(requestTempDir, { recursive: true, force: true }).catch(() => {});
  }
});

// Utility function to wrap exec in a Promise with timeout
function execPromise(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    exec(
      cmd,
      { maxBuffer: 1024 * 1024, ...options },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve(stdout);
      }
    );
  });
}

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Recursion visualizer backend is up and running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Temporary files will be stored in: ${TEMP_DIR}`);
});