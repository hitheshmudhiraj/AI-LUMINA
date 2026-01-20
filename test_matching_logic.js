
// Mock Data (Subset of debugger.json)
const debuggerData = [
    {
        "question": "print(Hello World)",
        "answer": "CORRECT_MATCH_HELLO_WORLD"
    },
    {
        "question": "a = 5\nb = 10\na = b\nb = a\nprint(a, b)",
        "answer": "WRONG_MATCH_SWAPPING"
    }
];

function findSampleResponse(userMessage) {
    // Helper: Tokenize string into meaningful words
    const getTokens = (str) => {
        return str.toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ') // Replace symbols with spaces
            .split(/\s+/)                  // Split by whitespace
            .filter(t => t.length >= 1);   // Keep all tokens including single chars
    };

    const inputTokens = getTokens(userMessage);

    // 1. First, check for Normalized Substring Match (Strongest match)
    // This handles cases like "print(helloworld)" matching "print(Hello World)"
    const normalize = (str) => str.toLowerCase().replace(/\s+/g, '').trim();
    const normalizedInput = normalize(userMessage);

    console.log(`Input: "${userMessage}"`);
    console.log(`Normalized Input: "${normalizedInput}"`);

    for (let sample of debuggerData) {
        // Check if input is contained in sample OR sample is contained in input
        // (checking both directions helps if user types a subset or superset)
        const normSample = normalize(sample.question);
        // console.log(`Checking vs: "${sample.question}" (Norm: "${normSample}")`);

        if (normSample.includes(normalizedInput) || normalizedInput.includes(normSample)) {
            console.log(`-> MATCH FOUND VIA NORMALIZATION: ${sample.answer}`);
            return sample.answer;
        }
    }

    // 2. Fallback to Jaccard Similarity (Fuzzy match)
    let bestMatch = null;
    let maxScore = 0;

    for (let sample of debuggerData) {
        const sampleTokens = getTokens(sample.question);
        if (sampleTokens.length === 0) continue;

        // Calculate overlap
        let matchCount = 0;
        const sampleTokenSet = new Set(sampleTokens);

        for (let token of inputTokens) {
            if (sampleTokenSet.has(token)) {
                matchCount++;
            }
        }

        // Jaccard Similarity
        const unionSize = inputTokens.length + sampleTokens.length - matchCount;
        const score = unionSize > 0 ? matchCount / unionSize : 0;

        console.log(`VS "${sample.question.substring(0, 20)}...": Score=${score.toFixed(3)}`);

        if (score > maxScore) {
            maxScore = score;
            bestMatch = sample;
        }
    }

    // Threshold: 0.2 (20% overlap)
    if (maxScore > 0.2) {
        console.log(`-> MATCH FOUND VIA JACCARD: ${bestMatch.answer}`);
        return bestMatch.answer;
    }

    console.log("-> NO MATCH FOUND");
    return null;
}

console.log("--- TEST 1: The Original Bug 'print(helloworld)' ---");
const res1 = findSampleResponse("print(helloworld)");
if (res1 !== "CORRECT_MATCH_HELLO_WORLD") {
    console.error("FAIL: Did not match Hello World sample!");
    process.exit(1);
}

console.log("\n--- TEST 2: Swapping Logic 'a=5 b=10' ---");
const res2 = findSampleResponse("a = 5, b = 10");
if (res2 !== "WRONG_MATCH_SWAPPING") {
    console.error("FAIL: Did not match Swapping sample!");
    process.exit(1);
}

console.log("\n--- TEST 3: Random Non-Matching Input 'x = y + z' ---");
const res3 = findSampleResponse("x = y + z");
if (res3 !== null) {
    console.error("FAIL: Should not match anything!");
    process.exit(1);
}

console.log("\nSUCCESS: All matching logic tests passed.");
