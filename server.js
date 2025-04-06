const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '1mb' }));

// Transforms user's Java code into an animated trace version
function transformJavaCode(inputCode) {
    // Extract function name and parameter from the user's code
    const match = inputCode.match(/int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/);
    if (!match) throw new Error('No valid recursive int method found in the input code.');
    const functionName = match[1];
    const param = match[2];

    // Generate the transformed Java code with proper string handling
    return `
public class Main {
    public static int ${functionName}(int ${param}, int depth) throws InterruptedException {
        String indent = "|   ".repeat(depth); // Using ASCII '|' for simplicity and compatibility

        // Entering the function
        printWithDelay(indent + "---> Entering ${functionName}(" + ${param} + ")", 400);
        printWithDelay(indent + "    Recursion depth: " + depth, 300);
        printWithDelay(indent + "    Checking base case: " + ${param} + " == 0", 300);

        // Base case
        if (${param} == 0) {
            printWithDelay(indent + "    Base case reached, returning 1", 300);
            printWithDelay(indent + "<--- Returning 1 from ${functionName}(0)", 400);
            return 1;
        }

        // Recursive case
        int nextParam = ${param} - 1;
        printWithDelay(indent + "    Will compute: " + ${param} + " * ${functionName}(" + nextParam + ")", 400);
        printWithDelay(indent + "    Calling ${functionName}(" + nextParam + ") at depth " + (depth + 1), 300);

        int recursiveResult = ${functionName}(nextParam, depth + 1);

        printWithDelay(indent + "    Returned from ${functionName}(" + nextParam + ") with " + recursiveResult, 300);
        int result = ${param} * recursiveResult;
        printWithDelay(indent + "    Computed: " + ${param} + " * " + recursiveResult + " = " + result, 400);
        printWithDelay(indent + "<--- Returning " + result + " from ${functionName}(" + ${param} + ")", 400);

        return result;
    }

    public static void printWithDelay(String msg, int ms) throws InterruptedException {
        System.out.println(msg);
        Thread.sleep(ms);
    }

    public static void main(String[] args) throws InterruptedException {
        int input = 5; // Default input value
        System.out.println("Animated Recursion Trace for ${functionName}(" + input + "):\\n");
        int result = ${functionName}(input, 0);
        printWithDelay("\\nFinal Result: " + result, 0);
    }
}
`.trim();
}

// POST endpoint to transform and execute the code
app.post('/transform-run', async (req, res) => {
    try {
        const userCode = req.body.code;
        if (!userCode || typeof userCode !== 'string') {
            return res.status(400).send("Invalid input: 'code' must be a non-empty string.");
        }

        const transformedCode = transformJavaCode(userCode);
        const filePath = path.join(__dirname, 'Main.java');

        // Write the file with explicit UTF-8 encoding
        fs.writeFileSync(filePath, transformedCode, { encoding: 'utf8' });

        // Compile and run with UTF-8 encoding
        exec(`javac -encoding UTF-8 Main.java && java Main`, { timeout: 15000 }, (err, stdout, stderr) => {
            // Clean up the generated file regardless of success or failure
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error(`Failed to delete ${filePath}: ${unlinkErr}`);
            });

            if (err) {
                console.error("Execution error:", stderr);
                return res.status(500).send("Compilation/Execution error:\n" + stderr);
            }
            res.send(stdout);
        });
    } catch (e) {
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