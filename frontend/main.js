// Sidebar open/close logic
const aiAssistantBtns = document.querySelectorAll('.ai-assistant, #aiAssistantBtn');
const aiChatSidebar = document.getElementById('aiChatSidebar');
const aiChatCloseBtn = document.getElementById('aiChatCloseBtn');
const aiChatForm = document.getElementById('aiChatForm');
const aiChatInput = document.getElementById('aiChatInput');
const aiChatMessages = document.getElementById('aiChatMessages');

aiAssistantBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    aiChatSidebar.classList.add('open');
  });
});

aiChatCloseBtn.addEventListener('click', () => {
  aiChatSidebar.classList.remove('open');
});

// Demo: Add user message to chat
aiChatForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const msg = aiChatInput.value.trim();
  if (!msg) return;
  const userMsg = document.createElement('div');
  userMsg.className = 'ai-chat-message ai-chat-message-user';
  userMsg.innerHTML = `<div class="ai-chat-bubble">${msg}</div>`;
  aiChatMessages.appendChild(userMsg);
  aiChatInput.value = '';
  aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
  // Optionally, add a fake bot reply after a delay
}); 