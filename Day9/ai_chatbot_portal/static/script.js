document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatContainer = document.getElementById('chat-container');
    const welcomeScreen = document.getElementById('welcome-screen');
    const newChatBtn = document.getElementById('new-chat-btn');
    const sendBtn = document.getElementById('send-btn');
    const suggestionCards = document.querySelectorAll('.suggestion-card');

    // Message History Array to track conversation
    let conversationHistory = [];

    // Helper to format simple markdown-like code blocks and lists
    function formatMessage(text) {
        // Safe HTML escape
        let escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Code blocks: ```code```
        escaped = escaped.replace(/```([\s\S]+?)```/g, (match, p1) => {
            return `<pre><code>${p1.trim()}</code></pre>`;
        });

        // Inline code: `code`
        escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold: **text**
        escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Lists: lines starting with "- " or "* "
        const lines = escaped.split('\n');
        let inList = false;
        const formattedLines = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const itemContent = trimmed.substring(2);
                if (!inList) {
                    inList = true;
                    return `<ul><li>${itemContent}</li>`;
                }
                return `<li>${itemContent}</li>`;
            } else {
                if (inList) {
                    inList = false;
                    return `</ul><p>${line}</p>`;
                }
                return line ? `<p>${line}</p>` : '';
            }
        });

        if (inList) {
            formattedLines.push('</ul>');
        }

        return formattedLines.join('');
    }

    // Scroll to the bottom of the chat container
    function scrollToBottom() {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    // Append a message to the chat display
    function appendMessage(sender, text) {
        // Hide welcome screen if showing
        if (welcomeScreen.style.display !== 'none') {
            welcomeScreen.style.display = 'none';
        }

        const messageEl = document.createElement('div');
        messageEl.classList.add('message', sender);

        if (sender === 'bot') {
            messageEl.innerHTML = `
                <div class="msg-avatar">
                    <i class="fa-solid fa-robot"></i>
                </div>
                <div class="msg-bubble">
                    ${formatMessage(text)}
                </div>
            `;
        } else {
            messageEl.innerHTML = `
                <div class="msg-bubble">${formatMessage(text)}</div>
            `;
        }

        chatContainer.appendChild(messageEl);
        scrollToBottom();
    }

    // Append Typing Indicator
    function showTypingIndicator() {
        const indicatorEl = document.createElement('div');
        indicatorEl.classList.add('message', 'bot', 'temp-indicator');
        indicatorEl.innerHTML = `
            <div class="msg-avatar">
                <i class="fa-solid fa-robot"></i>
            </div>
            <div class="msg-bubble">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        chatContainer.appendChild(indicatorEl);
        scrollToBottom();
        return indicatorEl;
    }

    // Send query to the API
    async function handleQuery(queryText) {
        if (!queryText || !queryText.trim()) return;

        // Display user message
        appendMessage('user', queryText);
        conversationHistory.push({ role: 'user', content: queryText });

        // Show typing indicator
        const typingIndicator = showTypingIndicator();

        // Disable input & send button while generating
        userInput.disabled = true;
        sendBtn.disabled = true;
        sendBtn.style.opacity = '0.5';

        try {
            const response = await fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: queryText })
            });

            // Remove typing indicator
            typingIndicator.remove();

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Server error');
            }

            const data = await response.json();
            const botResponse = data.response;

            // Display bot message
            appendMessage('bot', botResponse);
            conversationHistory.push({ role: 'bot', content: botResponse });

        } catch (error) {
            console.error('Fetch Error:', error);
            // Remove typing indicator if it exists
            if (typingIndicator) typingIndicator.remove();
            appendMessage('bot', `⚠️ Error: ${error.message || 'Failed to fetch response. Make sure the backend server is running.'}`);
        } finally {
            // Re-enable inputs
            userInput.disabled = false;
            sendBtn.disabled = false;
            sendBtn.style.opacity = '1';
            userInput.focus();
        }
    }

    // Form submission listener
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = userInput.value.trim();
        userInput.value = '';
        handleQuery(text);
    });

    // New Chat handler
    newChatBtn.addEventListener('click', () => {
        // Clear chat content except the welcome screen
        chatContainer.innerHTML = '';
        welcomeScreen.style.display = 'block';
        chatContainer.appendChild(welcomeScreen);
        conversationHistory = [];
        userInput.value = '';
        userInput.disabled = false;
        sendBtn.disabled = false;
        sendBtn.style.opacity = '1';
        userInput.focus();
    });

    // Suggestion cards click handler
    suggestionCards.forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.getAttribute('data-prompt');
            handleQuery(prompt);
        });
    });
});
