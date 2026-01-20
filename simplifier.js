// Simplifier Chatbot Module
// Helper for Firestore
// const { collection, addDoc, onSnapshot, query, orderBy, limit } = firebase.firestore;

document.addEventListener('DOMContentLoaded', () => {
    const messagesArea = document.getElementById('simplifier-messages');
    const chatInput = document.getElementById('simplifier-chat-input');
    const sendBtn = document.getElementById('simplifier-send-btn');
    const voiceBtn = document.getElementById('simplifier-voice-input');
    const imageUploadBtn = document.getElementById('simplifier-image-upload');
    const imageInput = document.getElementById('simplifier-image-input');
    const historyList = document.getElementById('simplifier-history-list');
    const clearHistoryBtn = document.getElementById('clear-simplifier-history');
    const newPageBtn = document.getElementById('new-simplifier-page');

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
            voiceBtn.style.color = '#8b5cf6';
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
        document.querySelectorAll('#simplifier-messages .suggestion-chip').forEach(chip => {
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
            if (confirm('Reset this session? Current chat will be cleared.')) {
                messagesArea.innerHTML = emptyChatStateHTML;
                chatInput.value = '';
                chatInput.style.height = 'auto';
                initSuggestionChips();
                messagesArea.scrollTop = 0;
                console.log('Simplifier session reset.');
            }
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        localStorage.removeItem('simplifier_history');
        renderHistory();
    });

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
                    module: 'simplifier'
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

    // Load simplifier data (Hardcoded for file:// protocol compatibility)
    let simplifierData = [
        {
            "input": "int temp = a;\na = b;\nb = temp;",
            "output": "**Simplified Code (C++):**\n```cpp\nstd::swap(a, b);\n```\n\n**Improvements:**\n- Uses standard library function\n- Clearer intent\n- Optimized by compiler"
        },
        {
            "input": "temp = x\nx = y\ny = temp",
            "output": "**Simplified Code (Python):**\n```python\nx, y = y, x\n```\n\n**Improvements:**\n- Pythonic tuple unpacking\n- More concise\n- No temporary variable"
        },
        {
            "input": "System.out.println(\"Hello\");\nSystem.out.println(\"World\");",
            "output": "**Simplified Code:**\n```java\nSystem.out.println(\"Hello World\");\n```\n\n**Improvements:**\n- Combined I/O operations\n- Reduced overhead"
        },
        {
            "input": "x = 0\nfor i in range(len(arr)):\n    x = x + arr[i]",
            "output": "**Simplified Code:**\n```python\nx = sum(arr)\n```\n\n**Improvements:**\n- Used built-in sum() function\n- More readable and Pythonic\n- Faster execution"
        },
        {
            "input": "if x > 5:\n    return True\nelse:\n    return False",
            "output": "**Simplified Code:**\n```python\nreturn x > 5\n```\n\n**Improvements:**\n- Direct boolean return\n- Eliminates unnecessary if-else\n- More concise"
        },
        {
            "input": "result = []\nfor item in items:\n    result.append(item * 2)",
            "output": "**Simplified Code:**\n```python\nresult = [item * 2 for item in items]\n```\n\n**Improvements:**\n- List comprehension is more Pythonic\n- Single line instead of three\n- Better performance"
        },
        {
            "input": "temp = a\na = b\nb = temp",
            "output": "**Simplified Code:**\n```python\na, b = b, a\n```\n\n**Improvements:**\n- Python's tuple unpacking\n- No temporary variable needed\n- More elegant"
        },
        {
            "input": "if len(my_list) == 0:\n    print('Empty')",
            "output": "**Simplified Code:**\n```python\nif not my_list:\n    print('Empty')\n```\n\n**Improvements:**\n- More Pythonic\n- Empty lists are falsy\n- Cleaner syntax"
        },
        {
            "input": "if (a > b) {\n    max = a;\n} else {\n    max = b;\n}",
            "output": "**Simplified Code:**\n```c\nmax = (a > b) ? a : b;\n```\n\n**Improvements:**\n- Uses ternary operator\n- Single line instead of five\n- Common professional pattern"
        },
        {
            "input": "for (int i = 0; i < vec.size(); i++) {\n    std::cout << vec[i] << std::endl;\n}",
            "output": "**Simplified Code:**\n```cpp\nfor (const auto& item : vec) {\n    std::cout << item << std::endl;\n}\n```\n\n**Improvements:**\n- Range-based for loop (C++11+)\n- No manual index management\n- Cleaner and safer syntax"
        },
        {
            "input": "<div id=\"header\">\n    <div class=\"nav-links\">\n        <div class=\"link\">Home</div>\n    </div>\n</div>",
            "output": "**Simplified Code:**\n```html\n<header>\n    <nav>\n        <ul><li>Home</li></ul>\n    </nav>\n</header>\n```\n\n**Improvements:**\n- Uses semantic HTML5 tags\n- Better for SEO and Accessibility\n- Much cleaner structure"
        }
    ];

    async function loadSimplifierData() {
        console.log("Simplifier data loaded locally");
    }

    function findSampleResponse(userMessage) {
        if (!simplifierData || simplifierData.length === 0) {
            return null;
        }

        // Helper: Tokenize string into meaningful words
        const getTokens = (str) => {
            return str.toLowerCase()
                .replace(/[^a-z0-9\s]/g, ' ') // Replace symbols with spaces
                .split(/\s+/)                  // Split by whitespace
                .filter(t => t.length >= 1);
        };

        const inputTokens = getTokens(userMessage);

        // 1. First, check for Normalized Substring Match (Strongest match)
        const normalize = (str) => str.toLowerCase().replace(/\s+/g, '').trim();
        const normalizedInput = normalize(userMessage);

        for (let sample of simplifierData) {
            const normSample = normalize(sample.input);
            if (normSample.includes(normalizedInput) || normalizedInput.includes(normSample)) {
                return sample.output;
            }
        }

        // 2. Fallback to Jaccard Similarity (Fuzzy match)

        let bestMatch = null;
        let maxScore = 0;

        for (let sample of simplifierData) {
            const sampleTokens = getTokens(sample.input);
            if (sampleTokens.length === 0) continue;

            let matchCount = 0;
            const sampleTokenSet = new Set(sampleTokens);

            for (let token of inputTokens) {
                if (sampleTokenSet.has(token)) {
                    matchCount++;
                }
            }

            const unionSize = inputTokens.length + sampleTokens.length - matchCount;
            const score = unionSize > 0 ? matchCount / unionSize : 0;

            if (score > maxScore) {
                maxScore = score;
                bestMatch = sample;
            }
        }

        if (maxScore > 0.2) {
            return bestMatch.output;
        }

        return `❌ **Invalid Question**\n\nThis specific program was not found in our offline simplification database.\n\nPlease provide a code snippet that needs simplification.`;
    }

    function addMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = type === 'user' ? '👤' : '✨';

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
        avatar.innerHTML = '✨';

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
            await db.collection('simplifier_history').add({
                message: message.substring(0, 50),
                fullMessage: message,
                time: new Date().toLocaleTimeString(),
                timestamp: new Date()
            });
        } catch (e) {
            console.error("Error adding document: ", e);
        }
    }

    function renderHistory() {
        db.collection("simplifier_history").orderBy("timestamp", "desc").limit(20)
            .onSnapshot((querySnapshot) => {
                if (querySnapshot.empty) {
                    historyList.innerHTML = '<p class="empty-state">No recent simplifications</p>';
                    return;
                }

                let html = '';
                querySnapshot.forEach((doc) => {
                    const item = doc.data();
                    html += `
                    <div class="history-item" data-full-message="${item.fullMessage.replace(/"/g, '&quot;')}">
                        <span class="time">${item.time}</span>
                        <div class="snippet">${item.message}...</div>
                    </div>
                `;
                });
                historyList.innerHTML = html;

                document.querySelectorAll('#simplifier-history .history-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const fullMessage = item.getAttribute('data-full-message');
                        if (fullMessage) {
                            chatInput.value = fullMessage;
                        }
                    });
                });
            });
    }

    renderHistory();
});
