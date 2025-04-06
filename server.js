const express = require('express');
const fs = require('fs').promises;
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Use built-in Express JSON parser instead of separate body-parser
app.use(express.json({ limit: '1mb' }));

// Transforms user's Java code into an animated, interactive trace version
function transformJavaCode(inputCode) {
    const match = inputCode.match(/int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/);
    if (!match) throw new Error('No valid recursive int method found in the input code.');
    const functionName = match[1];
    const param = match[2];

    return `
public class Main {
    public static int ${functionName}(int ${param}, int depth) throws InterruptedException {
        String indent = "  ".repeat(depth); // Simple space-based indentation

        System.out.println(indent + "[+] ----> Entering ${functionName}(" + ${param} + ") [Depth: " + depth + "]");
        Thread.sleep(500); // Slower for better visibility

        System.out.println(indent + "    | Stack: ${functionName}(" + ${param} + ")");
        Thread.sleep(300);

        if (${param} == 0) {
            System.out.println(indent + "    | [Base Case] " + ${param} + " == 0");
            Thread.sleep(300);
            System.out.println(indent + "    | Preparing to return 1");
            Thread.sleep(300);
            System.out.println(indent + "[-] <---- Returning 1 from ${functionName}(0)");
            Thread.sleep(500);
            return 1;
        }

        int nextParam = ${param} - 1;
        System.out.println(indent + "    | Will compute: " + ${param} + " * ${functionName}(" + nextParam + ")");
        Thread.sleep(300);
        System.out.println(indent + "    | ----> Calling ${functionName}(" + nextParam + ")");
        Thread.sleep(500);

        int result = ${functionName}(nextParam, depth + 1);

        System.out.println(indent + "    | <---- Returned " + result + " from ${functionName}(" + nextParam + ")");
        Thread.sleep(300);
        System.out.println(indent + "    | Computing: " + ${param} + " * " + result + " = " + (${param} * result));
        Thread.sleep(300);
        System.out.println(indent + "[-] <---- Returning " + (${param} * result) + " from ${functionName}(" + ${param} + ")");
        Thread.sleep(500);

        return ${param} * result;
    }

    public static void main(String[] args) throws InterruptedException {
        int input = 3; // Smaller input for testing
        System.out.println("=====================================");
        System.out.println("Starting Interactive Trace for ${functionName}(" + input + "):");
        System.out.println("=====================================");
        Thread.sleep(500);
        int result = ${functionName}(input, 0);
        Thread.sleep(500);
        System.out.println("=====================================");
        System.out.println("Final Result: " + result);
        System.out.println("=====================================");
    }
}
`.trim();
}

// POST endpoint to transform and execute the code
app.post('/transform-run', async (req, res) => {
    const filePath = path.join(__dirname, 'Main.java');

    try {
        const userCode = req.body.code;
        if (!userCode || typeof userCode !== 'string') {
            return res.status(400).send("Invalid input: 'code' must be a non-empty string.");
        }

        const transformedCode = transformJavaCode(userCode);
        console.log("Generated Java code:\n", transformedCode);

        await fs.writeFile(filePath, transformedCode, { encoding: 'utf8' });
        console.log("File written successfully:", filePath);

        exec(`javac -encoding UTF-8 Main.java && java Main`, { timeout: 15000 }, (err, stdout, stderr) => {
            fs.unlink(filePath).catch((unlinkErr) => {
                console.error("Failed to delete file:", unlinkErr);
            });

            if (err) {
                console.error("Execution stderr:", stderr);
                console.error("Execution error:", err);
                return res.status(500).send(`Execution failed:\n${stderr || err.message}`);
            }

            console.log("Execution stdout:", stdout);
            res.send(stdout);
        });
    } catch (e) {
        await fs.unlink(filePath).catch(() => {});
        console.error("Transformation error:", e);
        res.status(400).send("Transformation failed: " + e.message);
    }
});

// Basic GET route
app.get('/', (req, res) => {
    res.send('Recursion visualizer backend is up');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});