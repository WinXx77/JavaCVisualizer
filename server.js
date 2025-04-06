const express = require('express');
const fs = require('fs').promises;
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));

// Transforms user's Java code into an ultimate visualization
function transformJavaCode(inputCode) {
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
        Thread.sleep(600);

        // Stack and memory state
        System.out.println(indent + treeIndent + "├── Stack Push: ${functionName}(" + ${param} + ")");
        System.out.println(indent + treeIndent + "│   Memory: ${param} = " + ${param});
        Thread.sleep(400);

        if (${param} == 0) {
            System.out.println(indent + treeIndent + "├── [BASE CASE]");
            System.out.println(indent + treeIndent + "│   Condition: " + ${param} + " == 0");
            Thread.sleep(400);
            System.out.println(indent + treeIndent + "│   Action: Returning 1");
            Thread.sleep(400);
            System.out.println(indent + "╔════════════════════════════════════╗");
            System.out.println(indent + "║ [-] RETURN: 1 from ${functionName}(0)         ║");
            System.out.println(indent + "╚════════════════════════════════════╝");
            Thread.sleep(600);
            return 1;
        }

        int nextParam = ${param} - 1;
        System.out.println(indent + treeIndent + "├── Compute: " + ${param} + " * ${functionName}(" + nextParam + ")");
        Thread.sleep(400);
        System.out.println(indent + treeIndent + "└── Diving into ${functionName}(" + nextParam + ") --->");
        Thread.sleep(600);

        int result = ${functionName}(nextParam, depth + 1);

        // Return visualization
        System.out.println(indent + treeIndent + "┌── Returned: " + result + " from ${functionName}(" + nextParam + ")");
        Thread.sleep(400);
        System.out.println(indent + treeIndent + "├── Result: " + ${param} + " * " + result + " = " + (${param} * result));
        System.out.println(indent + treeIndent + "│   Memory Updated: ${param} = " + (${param} * result));
        Thread.sleep(400);
        System.out.println(indent + "╔════════════════════════════════════╗");
        System.out.println(indent + "║ [-] RETURN: " + (${param} * result) + " from ${functionName}(" + ${param} + ")  ║");
        System.out.println(indent + "╚════════════════════════════════════╝");
        Thread.sleep(600);

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

        exec(`javac -encoding UTF-8 Main.java && java Main`, { timeout: 20000 }, (err, stdout, stderr) => {
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