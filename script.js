class YouLearningPlatform {
    constructor() {
        this.videos = [];
        this.currentVideo = null;
        this.geminiApiKey = '';
        this.isResizing = false;
        this.currentSplit = 80;
        this.isPanelVisible = true;
        this.currentPlaybackRate = 1;
        this.videoAspectRatio = 16/9;

        this.initializeElements();
        this.loadFromStorage();
        this.bindEvents();
        this.initializeVideoPlayer();
        this.setInitialSplit();
        this.setupResponsiveVideo();
    }

    initializeElements() {
        this.videoInput = document.getElementById('videoInput');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.videoPlayerWrapper = document.getElementById('videoPlayerWrapper');
        this.videoGrid = document.getElementById('videoGrid');
        this.videoCount = document.getElementById('videoCount');
        this.videoTitle = document.getElementById('videoTitle');
        this.videoDescription = document.getElementById('videoDescription');

        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.rewindBtn = document.getElementById('rewindBtn');
        this.forwardBtn = document.getElementById('forwardBtn');
        this.currentTimeEl = document.getElementById('currentTime');
        this.durationEl = document.getElementById('duration');
        this.speedSelect = document.getElementById('speedSelect');
        this.volumeBtn = document.getElementById('volumeBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.progressFilled = document.getElementById('progressFilled');
        this.progressBar = document.getElementById('progressBar');

        this.uploadBtn = document.getElementById('uploadBtn');
        this.panelToggleBtn = document.getElementById('panelToggleBtn');

        this.resizeDivider = document.getElementById('resizeDivider');
        this.videoSection = document.getElementById('videoSection');
        this.toolsSection = document.getElementById('toolsSection');

        this.toolTabs = document.querySelectorAll('.tool-tab');
        this.notesTool = document.getElementById('notesTool');
        this.askTool = document.getElementById('askTool');
        this.notesEditor = document.getElementById('notesEditor');
        this.boldBtn = document.getElementById('boldBtn');
        this.bulletBtn = document.getElementById('bulletBtn');
        this.clearNotesBtn = document.getElementById('clearNotesBtn');
        this.saveNotesBtn = document.getElementById('saveNotesBtn');

        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendBtn = document.getElementById('sendBtn');
    }

    bindEvents() {
        this.uploadBtn.addEventListener('click', () => this.videoInput.click());
        this.videoInput.addEventListener('change', (e) => this.handleVideoUpload(e));

        this.panelToggleBtn.addEventListener('click', () => this.togglePanel());

        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.rewindBtn.addEventListener('click', () => this.skip(-10));
        this.forwardBtn.addEventListener('click', () => this.skip(10));
        this.speedSelect.addEventListener('change', (e) => this.changeSpeed(e.target.value));
        this.volumeBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => this.changeVolume(e.target.value));
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        this.videoPlayer.addEventListener('timeupdate', () => this.updateProgress());
        this.videoPlayer.addEventListener('loadedmetadata', () => this.updateDuration());
        this.videoPlayer.addEventListener('ended', () => this.onVideoEnded());
        this.videoPlayer.addEventListener('play', () => this.updatePlayPauseButton());
        this.videoPlayer.addEventListener('pause', () => this.updatePlayPauseButton());
        this.videoPlayer.addEventListener('loadedmetadata', () => this.onVideoLoaded());

        this.progressBar.addEventListener('click', (e) => this.seek(e));

        this.setupResize();

        this.toolTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTool(tab.dataset.tool));
        });

        this.boldBtn.addEventListener('click', () => this.toggleBold());
        this.bulletBtn.addEventListener('click', () => this.toggleBullet());
        this.clearNotesBtn.addEventListener('click', () => this.clearNotes());
        this.saveNotesBtn.addEventListener('click', () => this.saveNotes());

        this.notesEditor.addEventListener('keydown', (e) => this.handleEditorKeydown(e));
        this.notesEditor.addEventListener('keyup', () => this.syncEditorState());
        this.notesEditor.addEventListener('mouseup', () => this.syncEditorState());
        this.notesEditor.addEventListener('focus', () => this.syncEditorState());
        this.notesEditor.addEventListener('input', () => this.saveToStorage());

        this.saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());

        // Add window resize listener for responsive video
        window.addEventListener('resize', () => this.updateVideoSize());
    }

    setupResize() {
        this.resizeDivider.addEventListener('mousedown', (e) => this.startResize(e));
        document.addEventListener('mousemove', (e) => this.resize(e));
        document.addEventListener('mouseup', () => this.stopResize());
    }

    startResize(e) {
        this.isResizing = true;
        this.resizeDivider.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    }

    resize(e) {
        if (!this.isResizing) return;

        const totalWidth = window.innerWidth;
        const newVideoWidth = e.clientX;
        const newToolsWidth = totalWidth - newVideoWidth;

        const minVideoWidth = 300;
        const minToolsWidth = 250;
        const maxToolsWidth = totalWidth * 0.7;

        if (newVideoWidth >= minVideoWidth && newToolsWidth >= minToolsWidth && newToolsWidth <= maxToolsWidth) {
            this.videoSection.style.width = `${newVideoWidth}px`;
            this.toolsSection.style.width = `${newToolsWidth}px`;
            this.resizeDivider.style.left = `${newVideoWidth}px`;

            this.currentSplit = (newVideoWidth / totalWidth) * 100;
            
            // Update video size when resizing
            this.updateVideoSize();
        }
    }

    stopResize() {
        this.isResizing = false;
        this.resizeDivider.classList.remove('dragging');
        document.body.style.cursor = 'default';
    }

    setInitialSplit() {
        const totalWidth = window.innerWidth;
        const videoWidth = totalWidth * 0.8;
        const toolsWidth = totalWidth * 0.2;

        this.videoSection.style.width = `${videoWidth}px`;
        this.toolsSection.style.width = `${toolsWidth}px`;
        this.resizeDivider.style.left = `${videoWidth}px`;
    }

    initializeVideoPlayer() {
        this.updatePlayPauseButton();
        this.updateVolumeButton();
    }

    async handleVideoUpload(event) {
        const files = Array.from(event.target.files);

        if (files.length === 0) return;

        if (this.videos.length + files.length > 50) {
            this.showNotification('Maximum 50 videos allowed', 'error');
            return;
        }

        for (const file of files) {
            if (this.isValidVideoFile(file)) {
                await this.addVideo(file);
            } else {
                this.showNotification(`Invalid file format: ${file.name}`, 'error');
            }
        }

        this.saveToStorage();
        this.updateVideoList();
        event.target.value = '';
    }

    isValidVideoFile(file) {
        const validTypes = ['video/mp4', 'video/webm', 'video/x-matroska', 'video/mkv', 'video/x-mkv'];
        const validExtensions = ['.mp4', '.webm', '.mkv'];
        
        const hasValidType = validTypes.includes(file.type);
        const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        
        return hasValidType || hasValidExtension;
    }

    async addVideo(file) {
        const videoId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const videoUrl = URL.createObjectURL(file);

        const video = {
            id: videoId,
            name: file.name,
            url: videoUrl,
            size: file.size,
            type: file.type,
            duration: 0,
            uploadDate: new Date().toISOString(),
            blobUrl: videoUrl,
            file: file // Store the file reference for recreation if needed
        };

        const tempVideo = document.createElement('video');
        tempVideo.src = videoUrl;
        
        try {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    console.log('Video metadata loading timeout - continuing without duration');
                    resolve();
                }, 30000);

                tempVideo.addEventListener('loadedmetadata', () => {
                    clearTimeout(timeout);
                    video.duration = tempVideo.duration;
                    resolve();
                });
                
                tempVideo.addEventListener('error', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
        } catch (error) {
            console.error('Video processing error:', error);
        }

        this.videos.push(video);
        this.showNotification(`Video uploaded: ${file.name} (${this.formatFileSize(file.size)})`, 'success');
    }

    updateVideoList() {
        this.videoGrid.innerHTML = '';
        this.videoCount.textContent = `${this.videos.length} video${this.videos.length !== 1 ? 's' : ''}`;

        if (this.videos.length === 0) {
            this.videoGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-video"></i>
                    <h3>No videos yet</h3>
                    <p>Upload your first lecture video to get started</p>
                </div>
            `;
            return;
        }

        this.videos.forEach(video => {
            const videoItem = document.createElement('div');
            videoItem.className = `video-item ${this.currentVideo?.id === video.id ? 'active' : ''}`;
            videoItem.innerHTML = `
                <div class="video-item-title">${this.truncateText(video.name, 30)}</div>
                <div class="video-item-meta">
                    ${this.formatFileSize(video.size)} • ${this.formatDuration(video.duration)}
                </div>
                <button class="video-remove-btn" onclick="platform.removeVideo('${video.id}')" title="Remove Video">
                    <i class="fas fa-times"></i>
                </button>
            `;
            videoItem.addEventListener('click', (e) => {
                if (!e.target.closest('.video-remove-btn')) {
                    this.loadVideo(video);
                }
            });
            this.videoGrid.appendChild(videoItem);
        });
    }

    async loadVideo(video) {
        // Check if the blob URL is still valid
        if (video.blobUrl && !(await this.isBlobUrlValid(video.blobUrl))) {
            // Recreate the blob URL if it was revoked
            if (video.file) {
                video.blobUrl = URL.createObjectURL(video.file);
                video.url = video.blobUrl;
            }
        }

        this.currentVideo = video;
        this.videoPlayer.src = video.url;
        this.videoPlayer.load();
        
        // Restore the previous playback speed
        this.videoPlayer.playbackRate = this.currentPlaybackRate;
        this.speedSelect.value = this.currentPlaybackRate;

        this.videoTitle.textContent = video.name;
        const durationText = video.duration > 0 ? 
            ` • ${Math.floor(video.duration / 3600)}h ${Math.floor((video.duration % 3600) / 60)}m` : 
            ' • Loading...';
        this.videoDescription.textContent = `Uploaded on ${new Date(video.uploadDate).toLocaleDateString()}${durationText}`;

        this.updateVideoList();
        this.showNotification(`Loaded: ${video.name}`, 'success');
        
        // Update video size after loading
        setTimeout(() => this.updateVideoSize(), 100);

        this.videoPlayer.onerror = () => {
            console.error('Video error:', this.videoPlayer.error);
            let errorMessage = 'Error playing video. ';
            
            switch(this.videoPlayer.error?.code) {
                case 1:
                    errorMessage += 'Video loading was aborted.';
                    break;
                case 2:
                    errorMessage += 'Network error occurred.';
                    break;
                case 3:
                    errorMessage += 'Video decoding failed.';
                    break;
                case 4:
                    errorMessage += 'Video format not supported.';
                    break;
                default:
                    errorMessage += 'Please try uploading again.';
            }
            
            this.showNotification(errorMessage, 'error');
        };
    }

    isBlobUrlValid(url) {
        try {
            // Try to fetch the URL to check if it's still valid
            return fetch(url, { method: 'HEAD' })
                .then(response => response.ok)
                .catch(() => false);
        } catch (error) {
            return false;
        }
    }

    removeVideo(videoId) {
        const index = this.videos.findIndex(v => v.id === videoId);
        if (index !== -1) {
            const video = this.videos[index];

            if (video.blobUrl) {
                URL.revokeObjectURL(video.blobUrl);
            }

            this.videos.splice(index, 1);

            if (this.currentVideo?.id === videoId) {
                this.currentVideo = null;
                this.videoPlayer.src = '';
                this.videoTitle.textContent = 'Select a video to start learning';
                this.videoDescription.textContent = 'Upload your lecture videos and start learning with AI assistance';
            }

            this.updateVideoList();
            this.saveToStorage();
            this.showNotification(`Removed: ${video.name}`, 'success');
        }
    }

    togglePlayPause() {
        if (this.videoPlayer.paused) {
            this.videoPlayer.play();
        } else {
            this.videoPlayer.pause();
        }
    }

    updatePlayPauseButton() {
        const icon = this.playPauseBtn.querySelector('i');
        if (this.videoPlayer.paused) {
            icon.className = 'fas fa-play';
        } else {
            icon.className = 'fas fa-pause';
        }
    }

    skip(seconds) {
        this.videoPlayer.currentTime += seconds;
    }

    changeSpeed(speed) {
        this.currentPlaybackRate = parseFloat(speed);
        this.videoPlayer.playbackRate = this.currentPlaybackRate;
    }

    toggleMute() {
        this.videoPlayer.muted = !this.videoPlayer.muted;
        this.updateVolumeButton();
    }

    updateVolumeButton() {
        const icon = this.volumeBtn.querySelector('i');
        if (this.videoPlayer.muted || this.videoPlayer.volume === 0) {
            icon.className = 'fas fa-volume-mute';
        } else if (this.videoPlayer.volume < 0.5) {
            icon.className = 'fas fa-volume-down';
        } else {
            icon.className = 'fas fa-volume-up';
        }
    }

    changeVolume(volume) {
        this.videoPlayer.volume = parseFloat(volume);
        this.volumeSlider.value = volume;
        this.updateVolumeButton();
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.videoPlayerWrapper.requestFullscreen().then(() => {
                // Update video size when entering fullscreen
                setTimeout(() => this.updateVideoSize(), 100);
            });
        } else {
            document.exitFullscreen().then(() => {
                // Update video size when exiting fullscreen
                setTimeout(() => this.updateVideoSize(), 100);
            });
        }
    }

    updateProgress() {
        const percent = (this.videoPlayer.currentTime / this.videoPlayer.duration) * 100;
        this.progressFilled.style.width = `${percent}%`;
        this.currentTimeEl.textContent = this.formatDuration(this.videoPlayer.currentTime);
    }

    updateDuration() {
        this.durationEl.textContent = this.formatDuration(this.videoPlayer.duration);
    }

    onVideoLoaded() {
        // Update aspect ratio when video metadata is loaded
        if (this.videoPlayer.videoWidth && this.videoPlayer.videoHeight) {
            this.videoAspectRatio = this.videoPlayer.videoWidth / this.videoPlayer.videoHeight;
        }
        this.updateVideoSize();
    }

    setupResponsiveVideo() {
        // Set initial video size
        setTimeout(() => this.updateVideoSize(), 100);
        
        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            setTimeout(() => this.updateVideoSize(), 100);
        });
    }

    updateVideoSize() {
        if (!this.videoPlayerWrapper) return;

        // Check if we're in fullscreen mode
        if (document.fullscreenElement) {
            // In fullscreen, use the entire screen
            this.videoPlayerWrapper.style.width = '100vw';
            this.videoPlayerWrapper.style.height = '100vh';
            this.videoPlayerWrapper.style.maxWidth = 'none';
            this.videoPlayerWrapper.style.maxHeight = 'none';
            this.videoPlayerWrapper.style.margin = '0';
            return;
        }

        const containerRect = this.videoSection.getBoundingClientRect();
        const availableWidth = containerRect.width - 32; // Account for padding
        const availableHeight = window.innerHeight - containerRect.top - 150; // Account for header and video info

        // If no video is loaded, set a default aspect ratio
        const aspectRatio = this.currentVideo ? this.videoAspectRatio : 16/9;
        
        // Calculate optimal size based on aspect ratio
        let optimalWidth = availableWidth;
        let optimalHeight = optimalWidth / aspectRatio;

        // If height is too large, calculate based on height instead
        if (optimalHeight > availableHeight) {
            optimalHeight = availableHeight;
            optimalWidth = optimalHeight * aspectRatio;
        }

        // Apply the calculated size
        this.videoPlayerWrapper.style.width = `${optimalWidth}px`;
        this.videoPlayerWrapper.style.height = `${optimalHeight}px`;
        this.videoPlayerWrapper.style.maxWidth = '100%';
        this.videoPlayerWrapper.style.maxHeight = `${availableHeight}px`;
        this.videoPlayerWrapper.style.margin = '0 auto'; // Center the video
    }

    seek(event) {
        const rect = event.target.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        this.videoPlayer.currentTime = percent * this.videoPlayer.duration;
    }

    onVideoEnded() {
        this.updatePlayPauseButton();
        const currentIndex = this.videos.findIndex(v => v.id === this.currentVideo?.id);
        if (currentIndex < this.videos.length - 1) {
            this.loadVideo(this.videos[currentIndex + 1]);
            this.videoPlayer.play();
        }
    }

    togglePanel() {
        this.isPanelVisible = !this.isPanelVisible;

        if (this.isPanelVisible) {
            this.toolsSection.style.display = 'flex';
            this.setInitialSplit();
            this.resizeDivider.style.display = 'block';
            this.panelToggleBtn.classList.remove('active');
        } else {
            this.toolsSection.style.display = 'none';
            this.videoSection.style.width = '100%';
            this.resizeDivider.style.display = 'none';
            this.panelToggleBtn.classList.add('active');
        }
        
        // Update video size after panel toggle
        setTimeout(() => this.updateVideoSize(), 100);
    }

    switchTool(toolName) {
        this.toolTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tool === toolName) {
                tab.classList.add('active');
            }
        });

        if (toolName === 'notes') {
            this.notesTool.style.display = 'flex';
            this.askTool.style.display = 'none';
        } else if (toolName === 'ask') {
            this.notesTool.style.display = 'none';
            this.askTool.style.display = 'flex';
            this.initializeAskTool();
        }
    }

    toggleBold() {
        document.execCommand('bold');
        this.syncEditorState();
        this.saveToStorage();
    }

    toggleBullet() {
        document.execCommand('insertUnorderedList');
        this.syncEditorState();
        this.saveToStorage();
    }

    handleEditorKeydown(e) {
        if (e.ctrlKey && e.key.toLowerCase() === 'b' && !e.shiftKey) {
            e.preventDefault();
            this.toggleBold();
        }

        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            this.toggleBullet();
        }
    }

    syncEditorState() {
        const isBold = document.queryCommandState('bold');
        const isList = document.queryCommandState('insertUnorderedList');

        this.boldBtn.classList.toggle('active', isBold);
        this.bulletBtn.classList.toggle('active', isList);
    }

    clearNotes() {
        if (confirm('Are you sure you want to clear all notes?')) {
            this.notesEditor.innerHTML = '';
            this.saveToStorage();
        }
    }

    saveNotes() {
        const notesContent = this.notesEditor.innerText || this.notesEditor.textContent;
        const blob = new Blob([notesContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notes-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showNotification('Notes saved successfully!', 'success');
    }

    initializeAskTool() {
        const storedApiKey = localStorage.getItem('gemini_api_key');
        if (storedApiKey) {
            this.geminiApiKey = storedApiKey;
            this.apiKeyInput.value = storedApiKey;
            this.apiKeyInput.type = 'text';
            this.apiKeyInput.placeholder = 'API Key Saved';
            this.apiKeyInput.disabled = true;
            this.saveApiKeyBtn.textContent = 'Saved ✓';
            this.saveApiKeyBtn.disabled = true;
        }

        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        if (this.chatMessages.children.length === 0) {
            if (this.geminiApiKey) {
                this.addMessage('assistant', 'Hello! I\'m your AI assistant. Your API key is configured and ready to use! How can I help you today?');
            } else {
                this.addMessage('assistant', 'Hello! I\'m your AI assistant. Please enter your API key to get started. You can get one from Google AI Studio.');
            }
        }
    }

    saveApiKey() {
        const apiKey = this.apiKeyInput.value.trim();
        if (apiKey) {
            this.geminiApiKey = apiKey;
            localStorage.setItem('gemini_api_key', apiKey);
            this.apiKeyInput.type = 'text';
            this.apiKeyInput.placeholder = 'API Key Saved';
            this.showNotification('API Key saved successfully!', 'success');
        } else {
            this.showNotification('Please enter a valid API key', 'error');
        }
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;

        if (!this.geminiApiKey) {
            this.showNotification('Please save your API key first', 'error');
            return;
        }

        this.addMessage('user', message);
        this.chatInput.value = '';

        this.showTypingIndicator();

        try {
            const response = await this.callGeminiAPI(message);
            this.hideTypingIndicator();
            this.addMessage('assistant', response);
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
            console.error('Gemini API Error:', error);
        }
    }

    async callGeminiAPI(message) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: message
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        bubbleDiv.textContent = content;
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleTimeString();
        
        messageDiv.appendChild(bubbleDiv);
        messageDiv.appendChild(timeDiv);
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        this.chatMessages.appendChild(indicator);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    saveToStorage() {
        const data = {
            notes: this.notesEditor.innerHTML,
            videos: this.videos.map(v => ({
                ...v,
                blobUrl: undefined // Don't store blob URLs in localStorage
            })),
            currentSplit: this.currentSplit
        };
        localStorage.setItem('youLearningPlatform', JSON.stringify(data));
    }

    loadFromStorage() {
        const stored = localStorage.getItem('youLearningPlatform');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.currentSplit = data.currentSplit || 80;

                if (data.notes) {
                    setTimeout(() => {
                        this.notesEditor.innerHTML = data.notes;
                    }, 100);
                }
            } catch (error) {
                console.error('Error loading stored data:', error);
            }
        }
    }

    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00:00';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

class PomodoroTimer {
    constructor() {
        this.workTime = 25;
        this.restTime = 5;
        this.currentTime = 25 * 60;
        this.isRunning = false;
        this.isWorkMode = true;
        this.interval = null;
        
        this.initializeElements();
        this.bindEvents();
        this.updateDisplay();
    }
    
    initializeElements() {
        this.timeDisplay = document.getElementById('pomodoroTime');
        this.modeDisplay = document.getElementById('pomodoroMode');
        this.startPauseBtn = document.getElementById('pomodoroStartPause');
        this.resetBtn = document.getElementById('pomodoroReset');
        this.workTimeInput = document.getElementById('pomodoroWorkTime');
        this.restTimeInput = document.getElementById('pomodoroRestTime');
    }
    
    bindEvents() {
        this.startPauseBtn.addEventListener('click', () => this.toggleTimer());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.workTimeInput.addEventListener('change', (e) => this.updateWorkTime(e.target.value));
        this.restTimeInput.addEventListener('change', (e) => this.updateRestTime(e.target.value));
    }
    
    toggleTimer() {
        if (this.isRunning) {
            this.pause();
        } else {
            this.start();
        }
    }
    
    start() {
        this.isRunning = true;
        this.startPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        this.startPauseBtn.classList.add('active');
        
        this.interval = setInterval(() => {
            this.currentTime--;
            this.updateDisplay();
            
            if (this.currentTime <= 0) {
                this.switchMode();
            }
        }, 1000);
    }
    
    pause() {
        this.isRunning = false;
        this.startPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        this.startPauseBtn.classList.remove('active');
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    
    reset() {
        this.pause();
        this.isWorkMode = true;
        this.currentTime = this.workTime * 60;
        this.updateDisplay();
    }
    
    switchMode() {
        this.isWorkMode = !this.isWorkMode;
        
        if (this.isWorkMode) {
            this.currentTime = this.workTime * 60;
            this.showNotification('Work time started!', 'info');
        } else {
            this.currentTime = this.restTime * 60;
            this.showNotification('Break time started!', 'info');
        }
        
        this.updateDisplay();
    }
    
    updateWorkTime(minutes) {
        const value = parseInt(minutes);
        if (value >= 1 && value <= 60) {
            this.workTime = value;
            if (this.isWorkMode && !this.isRunning) {
                this.currentTime = this.workTime * 60;
                this.updateDisplay();
            }
        }
    }
    
    updateRestTime(minutes) {
        const value = parseInt(minutes);
        if (value >= 1 && value <= 30) {
            this.restTime = value;
            if (!this.isWorkMode && !this.isRunning) {
                this.currentTime = this.restTime * 60;
                this.updateDisplay();
            }
        }
    }
    
    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        this.timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        this.modeDisplay.textContent = this.isWorkMode ? 'Work' : 'Break';
        this.modeDisplay.className = `pomodoro-nav-mode ${this.isWorkMode ? 'work' : 'break'}`;
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.platform = new YouLearningPlatform();
    window.pomodoroTimer = new PomodoroTimer();
});

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
        return;
    }

    switch (e.key) {
        case ' ':
            e.preventDefault();
            document.getElementById('playPauseBtn').click();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            document.getElementById('rewindBtn').click();
            break;
        case 'ArrowRight':
            e.preventDefault();
            document.getElementById('forwardBtn').click();
            break;
        case 'f':
        case 'F':
            e.preventDefault();
            document.getElementById('fullscreenBtn').click();
            break;
        case 'm':
        case 'M':
            e.preventDefault();
            document.getElementById('volumeBtn').click();
            break;
    }
});
