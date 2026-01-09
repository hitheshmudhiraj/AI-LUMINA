// Simplifier Chatbot Module
document.addEventListener('DOMContentLoaded', () => {
    const messagesArea = document.getElementById('simplifier-messages');
    const chatInput = document.getElementById('simplifier-chat-input');
    const sendBtn = document.getElementById('simplifier-send-btn');
    const voiceBtn = document.getElementById('simplifier-voice-input');
    const imageUploadBtn = document.getElementById('simplifier-image-upload');
    const imageInput = document.getElementById('simplifier-image-input');
    const historyList = document.getElementById('simplifier-history-list');
    const clearHistoryBtn = document.getElementById('clear-simplifier-history');

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

    // Suggestion chips
    document.querySelectorAll('#simplifier-messages .suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const suggestion = chip.getAttribute('data-suggestion');
            chatInput.value = suggestion;
            sendMessage();
        });
    });

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
            const response = await fetch('http://localhost:5000/chat', {
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

    let simplifierData = [];

    // Load simplifier data
    async function loadSimplifierData() {
        try {
            const response = await fetch('data/simplifier.json');
            simplifierData = await response.json();
        } catch (error) {
            console.error('Error loading simplifier data:', error);
        }
    }

    function findSampleResponse(userMessage) {
        if (!simplifierData || simplifierData.length === 0) {
            return null;
        }

        const samples = simplifierData;

        // Normalize helper: remove all whitespace and convert to lowercase
        const normalize = (str) => str.toLowerCase().replace(/\s+/g, '').trim();

        const normalizedInput = normalize(userMessage);

        // 1. Try exact match after normalization
        for (let sample of samples) {
            if (normalize(sample.input) === normalizedInput) {
                return sample.output;
            }
        }

        // 2. Try partial match: if input contains normalized sample or vice versa
        for (let sample of samples) {
            const normalizedSample = normalize(sample.input);
            if (normalizedInput.includes(normalizedSample) || normalizedSample.includes(normalizedInput)) {
                // Only return if at least 20 chars match to avoid false positives with very short snippets
                if (normalizedSample.length > 20 || normalizedInput.length > 20) {
                    return sample.output;
                }
            }
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

    function saveToHistory(message) {
        const history = JSON.parse(localStorage.getItem('simplifier_history') || '[]');
        const entry = {
            id: Date.now(),
            message: message.substring(0, 50),
            time: new Date().toLocaleTimeString()
        };
        history.unshift(entry);
        localStorage.setItem('simplifier_history', JSON.stringify(history.slice(0, 10)));
        renderHistory();
    }

    function renderHistory() {
        const history = JSON.parse(localStorage.getItem('simplifier_history') || '[]');
        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty-state">No recent simplifications</p>';
            return;
        }

        historyList.innerHTML = history.map(item => `
            <div class="history-item" data-id="${item.id}">
                <span class="time">${item.time}</span>
                <div class="snippet">${item.message}...</div>
            </div>
        `).join('');

        document.querySelectorAll('#simplifier-history .history-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.getAttribute('data-id');
                const history = JSON.parse(localStorage.getItem('simplifier_history') || '[]');
                const selected = history.find(h => h.id == id);
                if (selected) {
                    chatInput.value = selected.message;
                }
            });
        });
    }

    renderHistory();
});
