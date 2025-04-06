const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises; // Using promises for cleaner async handling
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '1mb' }));

// Transforms user's Java code into animated trace version
function transformJavaCode(inputCode) {
    const match = inputCode.match(/int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/);
    if (!match) throw new Error('No valid recursive int method found in the input code.');
    const functionName = match[1];
    const param = match[2];

    // Minimal, ASCII-only, error-free Java code
    return `
public class Main {
    public static int ${functionName}(int ${param}, int depth) throws InterruptedException {
        String indent = "  ".repeat(depth); // Simple spaces for indentation
        System.out.println(indent + "Entering ${functionName}(" + ${param} + ")");
        Thread.sleep(300);

        if (${param} == 0) {
            System.out.println(indent + "Base case: ${param} == 0, returning 1");
            Thread.sleep(300);
            System.out.println(indent + "Returning 1");
            return 1;
        }

        System.out.println(indent + "Calling ${functionName}(" + (${param} - 1) + ")");
        Thread.sleep(300);
        int result = ${functionName}(${param} - 1, depth + 1);
        System.out.println(indent + "Computed ${param} * " + result + " = " + (${param} * result));
        Thread.sleep(300);
        System.out.println(indent + "Returning " + (${param} * result));
        return ${param} * result;
    }

    public static void main(String[] args) throws InterruptedException {
        int input = 3; // Smaller input for faster testing
        System.out.println("Starting trace for ${functionName}(" + input + "):");
        int result = ${functionName}(input, 0);
        System.out.println("Final result: " + result);
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

        // Transform the code
        const transformedCode = transformJavaCode(userCode);
        console.log("Generated Java code:\n", transformedCode); // Log the generated code

        // Write the file
        await fs.writeFile(filePath, transformedCode, { encoding: 'utf8' });
        console.log("File written successfully:", filePath);

        // Compile and execute
        exec(`javac -encoding UTF-8 Main.java && java Main`, { timeout: 10000 }, (err, stdout, stderr) => {
            // Clean up the file
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
        // Clean up on error
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