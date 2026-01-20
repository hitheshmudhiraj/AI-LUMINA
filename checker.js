// Evaluator Chatbot Module
// Helper for Firestore
// const { collection, addDoc, onSnapshot, query, orderBy, limit } = firebase.firestore;

document.addEventListener('DOMContentLoaded', () => {
    const messagesArea = document.getElementById('checker-messages');
    const chatInput = document.getElementById('checker-chat-input');
    const sendBtn = document.getElementById('checker-send-btn');
    const voiceBtn = document.getElementById('checker-voice-input');
    const imageUploadBtn = document.getElementById('checker-image-upload');
    const imageInput = document.getElementById('checker-image-input');
    const historyList = document.getElementById('checker-history-list');
    // const clearHistoryBtn = document.getElementById('clear-checker-history');
    const newPageBtn = document.getElementById('new-evaluator-page');

    // Store initial empty state HTML
    const emptyChatStateHTML = messagesArea.innerHTML;

    let isProcessing = false;
    let recognition = null;

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            chatInput.value = transcript;
            chatInput.style.height = 'auto';
            chatInput.style.height = chatInput.scrollHeight + 'px';
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            voiceBtn.style.color = '';
        };

        recognition.onend = () => {
            voiceBtn.style.color = '';
        };
    } else {
        voiceBtn.style.display = 'none';
    }

    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
    });

    // Handle Keyboard Behavior
    chatInput.addEventListener('keydown', (e) => {
        // Submit on Right Arrow key (as requested) or Ctrl+Enter
        if ((e.key === 'ArrowRight' && !e.shiftKey) || (e.key === 'Enter' && e.ctrlKey)) {
            e.preventDefault();
            sendMessage();
        }
        // Standard Enter adds a newline (default behavior for textarea)
    });

    sendBtn.addEventListener('click', sendMessage);

    voiceBtn.addEventListener('click', () => {
        if (recognition) {
            voiceBtn.style.color = '#10b981';
            recognition.start();
        }
    });

    imageUploadBtn.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            addMessage('user', `[Image uploaded: ${file.name}]\n\nNote: Image processing will be implemented with OCR in the next update.`);
        }
    });

    // Suggestion chips initialization
    function initSuggestionChips() {
        document.querySelectorAll('#checker-messages .suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const suggestion = chip.getAttribute('data-suggestion');
                chatInput.value = suggestion;
                sendMessage();
            });
        });
    }

    // Initial call
    initSuggestionChips();

    // New Page functionality
    if (newPageBtn) {
        newPageBtn.addEventListener('click', () => {
            if (confirm('Reset evaluation? This will clear the current chat.')) {
                messagesArea.innerHTML = emptyChatStateHTML;
                chatInput.value = '';
                chatInput.style.height = 'auto';
                initSuggestionChips();
                messagesArea.scrollTop = 0;
                console.log('Evaluator session reset.');
            }
        });
    }

    // clearHistoryBtn removed

    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message || isProcessing) return;

        const emptyState = messagesArea.querySelector('.empty-chat-state');
        if (emptyState) {
            emptyState.remove();
        }

        addMessage('user', message);
        chatInput.value = '';
        chatInput.style.height = 'auto';

        const typingId = addTypingIndicator();
        isProcessing = true;
        sendBtn.disabled = true;

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    module: 'evaluator'
                })
            });

            if (!response.ok) {
                throw new Error('Backend request failed');
            }

            const data = await response.json();
            removeTypingIndicator(typingId);
            addMessage('ai', data.response);
            saveToHistory(message);

        } catch (error) {
            console.warn('Backend Error, falling back to sample data:', error);
            const sampleResponse = findSampleResponse(message);

            setTimeout(() => {
                removeTypingIndicator(typingId);
                if (sampleResponse) {
                    addMessage('ai', sampleResponse);
                    saveToHistory(message);
                } else {
                    addMessage('ai', '❌ Sorry, I couldn\'t connect to the backend and no sample data was found.\n\nError: ' + error.message);
                }
            }, 1000);
        } finally {
            isProcessing = false;
            sendBtn.disabled = false;
        }
    }

    // Load evaluator data (Hardcoded for file:// protocol compatibility)
    let evaluatorData = [
        {
            "input": "print(\"Hello World\")",
            "output": "**Analysis:** Likely HUMAN-WRITTEN (95% confidence)\n\n**Reasoning:**\n- Extremely basic standard example\n- No comments or docstrings\n- Universal first program\n\n**Indicators:** `Hello World` is the most common code snippet written by humans learning a language."
        },
        {
            "input": "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello World\");\n    }\n}",
            "output": "**Analysis:** Likely HUMAN-WRITTEN (90% confidence)\n\n**Reasoning:**\n- Standard Java boilerplate\n- Typical formatting for tutorials\n\n**Indicators:** Humans often memorize this exact structure."
        },
        {
            "input": "a, b = b, a",
            "output": "**Analysis:** Likely HUMAN-WRITTEN (80% confidence)\n\n**Reasoning:**\n- Idiomatic Python usage\n- Very concise\n- Common interview/learning snippet\n\n**Indicators:** Experienced Python developers use this pattern frequently."
        },
        {
            "input": "temp = a; a = b; b = temp;",
            "output": "**Analysis:** Likely HUMAN-WRITTEN (85% confidence)\n\n**Reasoning:**\n- Classic imperative swap logic\n- Used in almost every intro CS class for C/C++/Java\n\n**Indicators:** This is the foundational way humans learn variable manipulation."
        },
        {
            "input": "def calculate_sum(numbers):\n    total = 0\n    for num in numbers:\n        total += num\n    return total",
            "output": "**Analysis:** Likely HUMAN-WRITTEN (85% confidence)\n\n**Reasoning:**\n- Uses verbose loop instead of built-in sum()\n- Variable naming is clear but basic\n- Traditional imperative style\n- Common beginner pattern\n\n**Indicators:** Human developers often write explicit loops when learning."
        },
        {
            "input": "def fibonacci(n: int) -> int:\n    \"\"\"Calculate nth Fibonacci number using memoization.\"\"\"\n    memo = {0: 0, 1: 1}\n    def fib(x):\n        if x not in memo:\n            memo[x] = fib(x-1) + fib(x-2)\n        return memo[x]\n    return fib(n)",
            "output": "**Analysis:** Likely AI-GENERATED (75% confidence)\n\n**Reasoning:**\n- Type hints present\n- Comprehensive docstring\n- Optimal algorithm choice (memoization)\n- Clean nested function structure\n\n**Indicators:** AI tends to include type hints and docstrings consistently."
        },
        {
            "input": "x=5\ny=10\nz=x+y\nprint(z)",
            "output": "**Analysis:** Likely HUMAN-WRITTEN (90% confidence)\n\n**Reasoning:**\n- No spaces around operators\n- Very basic logic\n- No comments or documentation\n- Beginner-level code\n\n**Indicators:** Inconsistent spacing is common in human-written code."
        },
        {
            "input": "#include <stdlib.h>\nint main() {\n    int *a = malloc(10 * sizeof(int));\n    // process a\n    free(a);\n    return 0;\n}",
            "output": "**Analysis:** Likely AI-GENERATED (70% confidence)\n\n**Reasoning:**\n- Correct `sizeof` usage\n- Includes `free()` consistently\n- Clean minimal structure\n- No manual byte counting\n\n**Indicators:** AI is very reliable with basic C allocation patterns."
        },
        {
            "input": "void process() {\n    int* data = new int[100];\n    for(int i=0; i<100; i++) data[i] = i;\n    delete[] data;\n}",
            "output": "**Analysis:** Likely HUMAN-WRITTEN (80% confidence)\n\n**Reasoning:**\n- Manual memory management (raw pointers)\n- No exception safety\n- Missing `std::` prefixes\n- Traditional school-style code\n\n**Indicators:** Humans often use raw 'new'/'delete' in learning exercises."
        },
        {
            "input": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <title>AI Generated Page</title>\n</head>\n<body>\n    <main>\n        <section>\n            <h2>Perfect Content</h2>\n        </section>\n    </main>\n</body>\n</html>",
            "output": "**Analysis:** Likely AI-GENERATED (85% confidence)\n\n**Reasoning:**\n- Perfect indentation\n- All essential meta tags present\n- Semantic hierarchy (`main` > `section` > `h2`)\n- Standard doc type declaration\n\n**Indicators:** AI consistently generates boilerplate-perfect HTML."
        }
    ];

    async function loadEvaluatorData() {
        console.log("Evaluator data loaded locally");
    }

    function findSampleResponse(userMessage) {
        if (!evaluatorData || evaluatorData.length === 0) {
            return null;
        }

        // Helper: Tokenize string into meaningful words
        const getTokens = (str) => {
            return str.toLowerCase()
                .replace(/[^a-z0-9\s]/g, ' ') // Replace symbols with spaces
                .split(/\s+/)                  // Split by whitespace
                .filter(t => t.length >= 1);   // Keep all tokens
        };

        const inputTokens = getTokens(userMessage);

        // 1. First, check for Normalized Substring Match (Strongest match)
        const normalize = (str) => str.toLowerCase().replace(/\s+/g, '').trim();
        const normalizedInput = normalize(userMessage);

        for (let sample of evaluatorData) {
            const normSample = normalize(sample.input);
            if (normSample.includes(normalizedInput) || normalizedInput.includes(normSample)) {
                return sample.output;
            }
        }

        // 2. Fallback to Jaccard/Overlap Similarity (Fuzzy match)

        let bestMatch = null;
        let maxScore = 0;

        for (let sample of evaluatorData) {
            const sampleTokens = getTokens(sample.input);
            if (sampleTokens.length === 0) continue;

            // Calculate overlap (Number of input tokens found in sample)
            let matchCount = 0;
            const sampleTokenSet = new Set(sampleTokens);

            for (let token of inputTokens) {
                if (sampleTokenSet.has(token)) {
                    matchCount++;
                }
            }

            // Score: Weighted overlap. Using Jaccard Similarity would be nice, 
            // but simple overlap ratio relative to sample size is effective for "detection".
            // Let's use: (Matches / (Input Length + Sample Length - Matches)) -> Jaccard
            const unionSize = inputTokens.length + sampleTokens.length - matchCount;
            const score = unionSize > 0 ? matchCount / unionSize : 0;

            if (score > maxScore) {
                maxScore = score;
                bestMatch = sample;
            }
        }

        // Threshold: 0.2 (20% overlap) is usually enough for "rough" code matching
        if (maxScore > 0.2) {
            return bestMatch.output;
        }

        return `❌ **Invalid Question**\n\nThis code snippet was not found in our offline verification database.\n\nPlease provide a program to evaluate for AI generation or human authorship.`;
    }

    function addMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = type === 'user' ? '👤' : '✅';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.innerHTML = formatMessageContent(content);

        const timestamp = document.createElement('span');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();

        messageContent.appendChild(messageText);
        messageContent.appendChild(timestamp);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);

        messagesArea.appendChild(messageDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    function formatMessageContent(content) {
        // First convert any literal \n strings to real newlines
        let formatted = content.replace(/\\n/g, '\n');

        // Multi-line code blocks (```language\ncode\n```)
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
        });

        // Inline code (`code`)
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold text (**text**)
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Convert newlines to <br> (but not inside <pre> tags)
        const parts = formatted.split(/(<pre>[\s\S]*?<\/pre>)/);
        formatted = parts.map((part, index) => {
            if (index % 2 === 0) {
                return part.replace(/\n/g, '<br>');
            }
            return part;
        }).join('');

        return formatted;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function addTypingIndicator() {
        const typingId = 'typing-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai';
        messageDiv.id = typingId;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '✅';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

        messageContent.appendChild(typingIndicator);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);

        messagesArea.appendChild(messageDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;

        return typingId;
    }

    function removeTypingIndicator(typingId) {
        const typingElement = document.getElementById(typingId);
        if (typingElement) {
            typingElement.remove();
        }
    }

    async function saveToHistory(message) {
        try {
            await db.collection('evaluator_history').add({
                message: message.substring(0, 50),
                fullMessage: message,
                time: new Date().toLocaleTimeString(),
                timestamp: new Date()
            });
        } catch (e) {
            console.error("Error adding document: ", e);
        }
    }

    // Clear history logic removed

    function renderHistory() {
        db.collection("evaluator_history").orderBy("timestamp", "desc").limit(50)
            .onSnapshot((querySnapshot) => {
                const historyList = document.getElementById('checker-history-list');
                if (querySnapshot.empty) {
                    historyList.innerHTML = '<p class="empty-state">No recent checks</p>';
                    return;
                }

                let html = '';
                querySnapshot.forEach((doc) => {
                    const item = doc.data();
                    const id = doc.id;
                    html += `
                        <div class="history-item" data-id="${id}" data-full-message="${item.fullMessage.replace(/"/g, '&quot;')}">
                            <div class="history-content">
                                <span class="time">${item.time}</span>
                                <div class="snippet">${item.message}...</div>
                            </div>
                            <button class="delete-item-btn" title="Delete" data-delete-id="${id}">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    `;
                });
                historyList.innerHTML = html;

                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }

                document.querySelectorAll('#checker-history .history-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        if (e.target.closest('.delete-item-btn')) return;

                        const fullMessage = item.getAttribute('data-full-message');
                        if (fullMessage) {
                            chatInput.value = fullMessage;
                        }
                    });
                });

                document.querySelectorAll('#checker-history .delete-item-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const id = btn.getAttribute('data-delete-id');
                        if (confirm('Delete this item?')) {
                            try {
                                await db.collection("evaluator_history").doc(id).delete();
                            } catch (error) {
                                console.error("Error removing document: ", error);
                            }
                        }
                    });
                });
            });
    }

    renderHistory();
    loadEvaluatorData();
});
