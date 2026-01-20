// Debugger Chatbot Module
// Helper for Firestore
const { collection, addDoc, onSnapshot, query, orderBy, limit } = firebase.firestore;

document.addEventListener('DOMContentLoaded', () => {
    const messagesArea = document.getElementById('debugger-messages');
    const chatInput = document.getElementById('debugger-chat-input');
    const sendBtn = document.getElementById('debugger-send-btn');
    const voiceBtn = document.getElementById('debugger-voice-input');
    const imageUploadBtn = document.getElementById('debugger-image-upload');
    const imageInput = document.getElementById('debugger-image-input');
    const historyList = document.getElementById('debugger-history-list');
    // const clearHistoryBtn = document.getElementById('clear-debugger-history');
    const newPageBtn = document.getElementById('new-debugger-page');

    // Store the initial empty state HTML
    const emptyChatStateHTML = messagesArea.innerHTML;

    let isProcessing = false;
    let recognition = null;

    // Initialize speech recognition if available
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
        // We don't need to preventDefault here anymore for Enter
    });

    // Send button click
    sendBtn.addEventListener('click', sendMessage);

    // Voice input
    voiceBtn.addEventListener('click', () => {
        if (recognition) {
            voiceBtn.style.color = '#3b82f6';
            recognition.start();
        }
    });

    // Image upload
    imageUploadBtn.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // For now, just notify that image upload is not yet implemented
            addMessage('user', `[Image uploaded: ${file.name}]\n\nNote: Image processing will be implemented with OCR in the next update.`);
        }
    });

    // Suggestion chips initialization
    function initSuggestionChips() {
        document.querySelectorAll('#debugger-messages .suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const suggestion = chip.getAttribute('data-suggestion');
                chatInput.value = suggestion;
                sendMessage();
            });
        });
    }

    // Initial setup for suggestion chips
    initSuggestionChips();

    // New Page functionality
    if (newPageBtn) {
        newPageBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to start a new chat? This will clear the current session.')) {
                // Clear chat
                messagesArea.innerHTML = emptyChatStateHTML;
                // Reset input
                chatInput.value = '';
                chatInput.style.height = 'auto';
                // Re-initialize suggestion chips
                initSuggestionChips();
                // Scroll to top
                messagesArea.scrollTop = 0;
                console.log('Debugger session reset.');
            }
        });
    }

    // clearHistoryBtn removed

    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message || isProcessing) return;

        // Clear empty state
        const emptyState = messagesArea.querySelector('.empty-chat-state');
        if (emptyState) {
            emptyState.remove();
        }

        // Add user message
        addMessage('user', message);
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Show typing indicator
        const typingId = addTypingIndicator();

        // Disable input
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
                    module: 'debugger'
                })
            });

            if (!response.ok) {
                throw new Error('Backend request failed');
            }

            const data = await response.json();

            // Remove typing indicator
            removeTypingIndicator(typingId);

            // Add AI response
            addMessage('ai', data.response);

            // Save to history
            saveToHistory(message);

        } catch (error) {
            console.warn('Backend Error, falling back to sample data:', error);

            // Try to find a sample response
            const sampleResponse = findSampleResponse(message);

            // Artificial delay to simulate "thinking"
            setTimeout(() => {
                removeTypingIndicator(typingId);

                if (sampleResponse) {
                    addMessage('ai', sampleResponse);
                    saveToHistory(message);
                } else {
                    addMessage('ai', '❌ Sorry, I couldn\'t connect to the backend and no sample data was found. Make sure the server is running.\n\nError: ' + error.message);
                }
            }, 1000);
        } finally {
            isProcessing = false;
            sendBtn.disabled = false;
        }
    }

    function addMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = type === 'user' ? '👤' : '🤖';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const messageText = document.createElement('div');
        messageText.className = 'message-text';

        // Format code blocks
        const formattedContent = formatMessageContent(content);
        messageText.innerHTML = formattedContent;

        const timestamp = document.createElement('span');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();

        messageContent.appendChild(messageText);
        messageContent.appendChild(timestamp);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);

        messagesArea.appendChild(messageDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;

        // Reinitialize Lucide icons
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
        avatar.innerHTML = '🤖';

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
            await db.collection('debugger_history').add({
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
        db.collection("debugger_history").orderBy("timestamp", "desc").limit(50)
            .onSnapshot((querySnapshot) => {
                const historyList = document.getElementById('debugger-history-list'); // Ensure selector
                if (querySnapshot.empty) {
                    historyList.innerHTML = '<p class="empty-state">No recent sessions</p>';
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

                // Add click handlers for items
                document.querySelectorAll('#debugger-history .history-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        // If clicked target is inside delete button, do nothing (handled by delete btn listener)
                        if (e.target.closest('.delete-item-btn')) return;

                        const fullMessage = item.getAttribute('data-full-message');
                        if (fullMessage) {
                            chatInput.value = fullMessage;
                        }
                    });
                });

                // Add click handlers for delete buttons
                document.querySelectorAll('#debugger-history .delete-item-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation(); // Stop bubbling to item click
                        const id = btn.getAttribute('data-delete-id');
                        if (confirm('Delete this history item?')) {
                            try {
                                await db.collection("debugger_history").doc(id).delete();
                            } catch (error) {
                                console.error("Error removing document: ", error);
                            }
                        }
                    });
                });
            });
    }

    // Load debugger data (Hardcoded for file:// protocol compatibility)
    let debuggerData = [
        {
            "question": "print(Hello World)",
            "answer": "**Bug Found:**\nMissing double quotes around the string.\n\n**Corrected Code:**\n```python\nprint(\"Hello World\")\n```\n\n**Explanation:** Strings in Python must be enclosed in double quotes `\"` or single quotes `'`. Without them, Python thinks you are referring to variables named `Hello` and `World`."
        },
        {
            "question": "print(Hello)",
            "answer": "**Bug Found:**\nMissing double quotes around the string.\n\n**Corrected Code:**\n```python\nprint(\"Hello\")\n```\n\n**Explanation:** Strings must be enclosed in quotes. Python treats `Hello` as an undefined variable name."
        },
        {
            "question": "a = 5\nb = 10\na = b\nb = a\nprint(a, b)",
            "answer": "**Bug Found:**\nIncorrect swapping logic. `a = b` overwrites the initial value of `a`, losing it forever.\n\n**Corrected Code:**\n```python\na = 5\nb = 10\ntemp = a\na = b\nb = temp\nprint(a, b)\n# Or Pythonic way: a, b = b, a\n```\n\n**Explanation:** Use a temporary variable to hold the value of `a` before it gets overwritten."
        },
        {
            "question": "def say_hello()\nprint('Hello World')\nsay_hello",
            "answer": "**Bugs Found:**\n1. Missing colon after function definition.\n2. Missing indentation for the function body.\n3. Missing parentheses when calling the function.\n\n**Corrected Code:**\n```python\ndef say_hello():\n    print('Hello World')\n\nsay_hello()\n```\n\n**Explanation:** Functions need a colon and indented body. To execute a function, you must use parentheses `()`."
        },
        {
            "question": "num1 = input('Enter first number: ')\nnum2 = input('Enter second number: ')\nsum = num1 + num2\nprint('The sum is ' + sum)",
            "answer": "**Bugs Found:**\n1. `input()` returns a string, so `num1 + num2` performs string concatenation instead of addition.\n2. Cannot concatenate a string with a numeric sum (if it were converted) without casting.\n\n**Corrected Code:**\n```python\nnum1 = int(input('Enter first number: '))\nnum2 = int(input('Enter second number: '))\nsum_val = num1 + num2\nprint(f'The sum is {sum_val}')\n```\n\n**Explanation:** Use `int()` or `float()` to convert input strings to numbers for math operations. Use f-strings for easy printing."
        },
        {
            "question": "a = 5\nb = 10\nprint(f'Before: a={a}, b={b}')\na = b\nb = a\nprint(f'After: a={a}, b={b}')",
            "answer": "**Bug Found:**\nLogic error in swapping. `a = b` overwrites the original value of `a`, so `b = a` just sets `b` to its own value.\n\n**Corrected Code:**\n```python\na = 5\nb = 10\nprint(f'Before: a={a}, b={b}')\n\n# Method 1: Temporary variable\ntemp = a\na = b\nb = temp\n\n# Method 2: Pythonic way\n# a, b = b, a\n\nprint(f'After: a={a}, b={b}')\n```\n\n**Explanation:** You need a temporary variable to hold one value during the swap, or use Python's tuple unpacking: `a, b = b, a`."
        },
        {
            "question": "radius = 7\npi = 3.14\narea = pi * radius ^ 2\nprint('Area is: ' + area)",
            "answer": "**Bugs Found:**\n1. In Python, `^` is the Bitwise XOR operator, not exponentiation.\n2. Cannot concatenate string and float in `print`.\n\n**Corrected Code:**\n```python\nradius = 7\npi = 3.14\narea = pi * (radius ** 2)\nprint(f'Area is: {area}')\n```\n\n**Explanation:** Use `**` for exponentiation (powers). Use f-strings to include variables in print statements."
        },
        {
            "question": "def check_even(n):\nif n % 2 = 0:\nreturn True\nelse:\nreturn False",
            "answer": "**Bugs Found:**\n1. Incorrect indentation for `if/else` block.\n2. Using assignment (`=`) instead of comparison (`==`) in the condition.\n\n**Corrected Code:**\n```python\ndef check_even(n):\n    if n % 2 == 0:\n        return True\n    else:\n        return False\n```\n\n**Explanation:** Always use `==` for equality checks. Indentation is mandatory in Python to define code blocks."
        },
        {
            "question": "price = 100\ndiscount = 0.2\ntotal = price - price * discount\nif total < 50\nprint('Cheap!')\nelse\nprint('Expensive!')",
            "answer": "**Bugs Found:**\n1. Missing colons after `if` and `else` statements.\n2. Missing indentation for the print statements.\n\n**Corrected Code:**\n```python\nprice = 100\ndiscount = 0.2\ntotal = price - (price * discount)\nif total < 50:\n    print('Cheap!')\nelse:\n    print('Expensive!')\n```\n\n**Explanation:** Every `if` and `else` statement must end with a colon, and the following block must be indented."
        },
        {
            "question": "count = 0\nwhile count < 5\nprint('Counting: ' + count)\ncount = count + 1",
            "answer": "**Bugs Found:**\n1. Missing colon after `while` condition.\n2. Print statement and count increment are not indented.\n3. Type error: Cannot add string and integer.\n\n**Corrected Code:**\n```python\ncount = 0\nwhile count < 5:\n    print(f'Counting: {count}')\n    count += 1\n```\n\n**Explanation:** Indentation defines the loop body. Use `count += 1` for brevity and f-strings for printing variables."
        },
        {
            "question": "def get_average(list):\nsum = 0\nfor x in list:\nsum = sum + x\nreturn sum / len(list)",
            "answer": "**Bugs Found:**\n1. Missing indentation for the function body and loop body.\n2. Potential `ZeroDivisionError` if the list is empty.\n\n**Corrected Code:**\n```python\ndef get_average(numbers):\n    if not numbers:\n        return 0\n    total = 0\n    for x in numbers:\n        total += x\n    return total / len(numbers)\n```\n\n**Explanation:** Indent properly to show nested structure. Always check for empty lists before dividing by `len()`."
        },
        {
            "question": "items = ['apple', 'banana', 'cherry']\nfor i in range(len(items))\nprint('Item ' + i + ' is ' + items[i])",
            "answer": "**Bugs Found:**\n1. Missing colon in `for` loop.\n2. Missing indentation for `print`.\n3. Type error: `i` is an integer, cannot be added directly to strings.\n\n**Corrected Code:**\n```python\nitems = ['apple', 'banana', 'cherry']\nfor i in range(len(items)):\n    print(f'Item {i} is {items[i]}')\n```\n\n**Explanation:** In Python, you can't add `str + int`. Use f-strings or `str(i)` to convert the number."
        },
        {
            "question": "p = 1000\nr = 5\nt = 2\nsi = p * r * t / 100\nprint('Simple Interest is: ' + si)",
            "answer": "**Bugs Found:**\n1. Potential type error if `si` is used in string concatenation without conversion.\n2. Clarification: Ensure variables are descriptive.\n\n**Corrected Code:**\n```python\nprincipal = 1000\nrate = 5\ntime = 2\nsimple_interest = (principal * rate * time) / 100\nprint(f'Simple Interest is: {simple_interest}')\n```\n\n**Explanation:** Using descriptive names makes code readable. Use f-strings to avoid `TypeError` when printing numbers with text."
        },
        {
            "question": "#include <stdio.h>\nmain() {\n    printf(\"Hello World\")\n}",
            "answer": "**Bugs Found:**\n1. Missing return type for `main()` (standard C requires `int`).\n2. Missing semicolon at the end of the `printf` statement.\n\n**Corrected Code:**\n```c\n#include <stdio.h>\nint main() {\n    printf(\"Hello World\");\n    return 0;\n}\n```\n\n**Explanation:** In C, every statement must end with a semicolon. The `main` function should return an integer status code to the operating system."
        },
        {
            "question": "#include <stdio.h>\nint main() {\n    int x;\n    printf(\"Value of x: %d\", x);\n    return 0;\n}",
            "answer": "**Bug Found:**\nUsing an uninitialized variable `x`. In C, uninitialized local variables contain \"garbage values\" (random memory content).\n\n**Corrected Code:**\n```c\n#include <stdio.h>\nint main() {\n    int x = 0; // Initialize variable\n    printf(\"Value of x: %d\", x);\n    return 0;\n}\n```\n\n**Explanation:** Always initialize variables before using them to ensure predictable behavior."
        },
        {
            "question": "#include <stdio.h>\nint main() {\n    int *ptr = NULL;\n    *ptr = 10;\n    return 0;\n}",
            "answer": "**Bug Found:**\nDereferencing a NULL pointer. This will cause a Segmentation Fault (crash).\n\n**Corrected Code:**\n```c\n#include <stdio.h>\nint main() {\n    int val = 0;\n    int *ptr = &val; // Point to a valid memory location\n    *ptr = 10;\n    printf(\"Value: %d\", val);\n    return 0;\n}\n```\n\n**Explanation:** A pointer must point to a valid memory address before you can assign a value to it via dereferencing (`*`)."
        },
        {
            "question": "#include <iostream>\nint main() {\n    cout << \"Hello C++\" << endl;\n    return 0;\n}",
            "answer": "**Bug Found:**\n`cout` and `endl` are not defined in the global namespace. They are part of the `std` namespace.\n\n**Corrected Code:**\n```cpp\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello C++\" << endl;\n    return 0;\n}\n// OR use std:: prefix\n// std::cout << \"Hello C++\" << std::endl;\n```\n\n**Explanation:** Standard library components in C++ are inside the `std` namespace. You must either use `std::` or include `using namespace std;`."
        },
        {
            "question": "#include <iostream>\n#include <vector>\nint main() {\n    std::vector<int> v = {1, 2};\n    std::cout << v[5];\n    return 0;\n}",
            "answer": "**Bug Found:**\nIndex out of bounds. Accessing index 5 in a vector of size 2.\n\n**Corrected Code:**\n```cpp\n#include <iostream>\n#include <vector>\nint main() {\n    std::vector<int> v = {1, 2};\n    if (v.size() > 5) {\n        std::cout << v[5];\n    } else {\n        std::cout << \"Index out of range\" << std::endl;\n    }\n    return 0;\n}\n```\n\n**Explanation:** Always check the size of a container before accessing an index, or use `.at()` which provides range checking."
        },
        {
            "question": "class Box {\n    int width;\n    Box() { width = 10 }\n};",
            "answer": "**Bugs Found:**\n1. Members and constructor are private by default in a class.\n2. Missing semicolon after statement in constructor.\n\n**Corrected Code:**\n```cpp\nclass Box {\npublic: // Make members public\n    int width;\n    Box() : width(10) {} // Use initializer list\n};\n```\n\n**Explanation:** Use the `public:` keyword to make members accessible. Member initializer lists (`: width(10)`) are preferred in C++."
        },
        {
            "question": "<div>\n    <h1>Welcome\n    <p>This is a paragraph.\n</div>",
            "answer": "**Bugs Found:**\n1. Missing closing tag for `<h1>`.\n2. Missing closing tag for `<p>`.\n\n**Corrected Code:**\n```html\n<div>\n    <h1>Welcome</h1>\n    <p>This is a paragraph.</p>\n</div>\n```\n\n**Explanation:** Every opening tag should have a corresponding closing tag to ensure proper rendering and DOM structure."
        },
        {
            "question": "<img src=\"logo.png\">\n<a href=\"google.com\">Search</a>",
            "answer": "**Improvement Found:**\nWhile not strictly \"bugs,\" missing ALT text for images and missing protocols for absolute links are bad practices.\n\n**Corrected Code:**\n```html\n<img src=\"logo.png\" alt=\"App Logo\">\n<a href=\"https://google.com\">Search</a>\n```\n\n**Explanation:** Add `alt` attributes for accessibility. Use full URLs (including `https://`) for external links."
        },
        {
            "question": "<ul>\n    <div>Item 1</div>\n    <li>Item 2</li>\n</ul>",
            "answer": "**Bug Found:**\nIncorrect nesting. A `<ul>` or `<ol>` should only contain `<li>` elements as direct children.\n\n**Corrected Code:**\n```html\n<ul>\n    <li>Item 1</li>\n    <li>Item 2</li>\n</ul>\n```\n\n**Explanation:** To maintain valid HTML5 structure, strictly use list item tags (`<li>`) inside list containers."
        },
        {
            "question": "System.out.println(Hello World);",
            "answer": "**Bug Found:**\nMissing double quotes around the string in Java.\n\n**Corrected Code:**\n```java\nSystem.out.println(\"Hello World\");\n```\n\n**Explanation:** Java requires double quotes `\"` for string literals."
        },
        {
            "question": "int a = 5; int b = 10; a = b; b = a;",
            "answer": "**Bug Found:**\nLogic error in swapping (Java/C++). `a` loses its original value.\n\n**Corrected Code:**\n```java\nint temp = a;\na = b;\nb = temp;\n```\n\n**Explanation:** You need a temporary variable to perform a swap correctly in Java/C++."
        },
        {
            "question": "#include <stdio.h>\nmain() { printf(Hello World); }",
            "answer": "**Bug Found:**\nMissing double quotes in `printf` and missing return type.\n\n**Corrected Code:**\n```c\n#include <stdio.h>\nint main() {\n    printf(\"Hello World\");\n    return 0;\n}\n```\n\n**Explanation:** In C, strings must be in double quotes. Also, standard `main` should return `int`."
        }
    ];

    async function loadDebuggerData() {
        // No fetch needed, data is hardcoded
        console.log("Debugger data loaded locally");
    }

    function findSampleResponse(userMessage) {
        if (!debuggerData || debuggerData.length === 0) {
            return null;
        }

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

        for (let sample of debuggerData) {
            // Check if input is contained in sample OR sample is contained in input
            // (checking both directions helps if user types a subset or superset)
            const normSample = normalize(sample.question);
            if (normSample.includes(normalizedInput) || normalizedInput.includes(normSample)) {
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

            if (score > maxScore) {
                maxScore = score;
                bestMatch = sample;
            }
        }

        // Threshold: 0.2 (20% overlap)
        if (maxScore > 0.2) {
            return bestMatch.answer;
        }

        console.log('No debugger match found for:', userMessage.substring(0, 50));
        return `❌ **Invalid Question**\n\nThis specific program or error was not found in our offline sample database.\n\nPlease provide a clear Python code snippet from the common examples.`;
    }

    // Initial render
    loadDebuggerData();
    renderHistory();
});
