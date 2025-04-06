const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '1mb' }));

// Transforms user's Java code into animated trace version
function transformJavaCode(inputCode) {
    const match = inputCode.match(/int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/);
    if (!match) throw new Error('No valid recursive int method found.');
    const functionName = match[1];
    const param = match[2];

    return `
public class Main {

    public static int ${functionName}(int ${param}, int depth) throws InterruptedException {
        String indent = "│   ".repeat(depth);

        printWithDelay(indent + "├──> Entering ${functionName}(" + ${param} + ")", 400);
        printWithDelay(indent + "│   Recursion depth: " + depth, 300);
        printWithDelay(indent + "│   Pushing state to stack for ${param} = " + ${param}, 300);
        printWithDelay(indent + "│   Checking if " + ${param} + " == 0", 300);

        if (${param} == 0) {
            printWithDelay(indent + "│   Base case reached", 300);
            printWithDelay(indent + "│   Initializing return value with 1", 300);
            printWithDelay(indent + "│   Preparing to return from ${functionName}(0)", 300);
            printWithDelay(indent + "│   Saving result 1 in memory", 300);
            printWithDelay(indent + "│   Popping state from stack for ${param} = 0", 300);
            printWithDelay(indent + "│   └──> return 1", 400);
            return 1;
        }

        printWithDelay(indent + "│   Will compute: " + ${param} + " * ${functionName}(" + (${param} - 1) + ")", 400);
        printWithDelay(indent + "│   Saving state: waiting for result of ${functionName}(" + (${param} - 1) + ")", 300);
        printWithDelay(indent + "│   Calling ${functionName}(" + (${param} - 1) + ") at depth " + (depth + 1), 300);
        printWithDelay(indent + "│   Going deeper into ${functionName}(" + (${param} - 1) + ")", 300);

        int recursiveResult = ${functionName}(${param} - 1, depth + 1);

        printWithDelay(indent + "│   Returned from ${functionName}(" + (${param} - 1) + ") with result " + recursiveResult, 300);
        int result = ${param} * recursiveResult;
        printWithDelay(indent + "│   Computing: " + ${param} + " * " + recursiveResult + " = " + result, 400);
        printWithDelay(indent + "│   Computation complete for ${functionName}(" + ${param} + ")", 300);
        printWithDelay(indent + "│   Storing result " + result + " temporarily", 300);
        printWithDelay(indent + "│   Stack trace: ${functionName}(" + ${param} + ") → ${functionName}(" + (${param} - 1) + ")", 300);
        printWithDelay(indent + "│   Cleaning up temporary memory used for ${functionName}(" + ${param} + ")", 300);
        printWithDelay(indent + "│   Popping state from stack for ${param} = " + ${param}, 300);
        printWithDelay(indent + "│   Preparing to return result to caller", 300);
        printWithDelay(indent + "│   Exiting ${functionName}(" + ${param} + ")", 300);
        printWithDelay(indent + "│   Returning value: " + result, 300);
        printWithDelay(indent + "│   Historical trace: ${functionName}(" + ${param} + ") = " + result, 300);
        printWithDelay(indent + "│   └──> return " + result, 400);

        return result;
    }

    public static void printWithDelay(String msg, int ms) throws InterruptedException {
        System.out.println(msg);
        Thread.sleep(ms);
    }

    public static void main(String[] args) throws InterruptedException {
        int number = 5;
        System.out.println("Animated Recursion Trace for ${functionName}(" + number + "):\\n");
        int result = ${functionName}(number, 0);
        printWithDelay("\\nFinal Result: " + result, 0);
    }
}
`.trim();
}

// POST endpoint to transform and execute the code
app.post('/transform-run', async (req, res) => {
    try {
        const userCode = req.body.code;
        const transformedCode = transformJavaCode(userCode);
        const filePath = path.join(__dirname, 'Main.java');
        fs.writeFileSync(filePath, transformedCode);

        // Add -encoding UTF-8 to the javac command
        exec(`javac -encoding UTF-8 Main.java && java Main`, { timeout: 10000 }, (err, stdout, stderr) => {
            if (err) {
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
