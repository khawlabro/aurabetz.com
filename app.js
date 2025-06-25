// BetSmart Sports Betting Analysis App
class BetSmartApp {
    constructor() {
        // Initialize app state
        this.bets = [];
        this.gameData = {};
        this.selectedSport = 'All Sports';
        this.sortBy = 'value';
        this.highValueOnly = false;
        this.initialized = false;
        
        // Set up Firebase
        this.firebaseConfig = {
            apiKey: "AIzaSyDalVcdFUamoA90pSvNX2hfIkyH7hMZk9I",
            authDomain: "aurabetz1.firebaseapp.com",
            projectId: "aurabetz1",
            storageBucket: "aurabetz1.appspot.com",
            messagingSenderId: "254316956886",
            appId: "1:254316956886:web:3ea3341005161efbe88d77",
            measurementId: "G-R8WRSY7L57"
        };

        try {
            // Initialize Firebase if not already initialized
            this.app = firebase.apps.length 
                ? firebase.app() 
                : firebase.initializeApp(this.firebaseConfig);
            
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            console.log("Firebase initialized successfully");
            this.initAuth();
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            this.handleError("Failed to initialize Firebase services");
        }
    }

    // Initialize authentication flow
    initAuth() {
        // Check for cached PIN first
        const cachedPin = localStorage.getItem('betSmartAuth');
        if (cachedPin) {
            this.verifyPin(cachedPin);
            return;
        }

        // Set up auth state listener
        this.auth.onAuthStateChanged(user => {
            if (user) {
                console.log("User authenticated");
                this.initApp();
            } else {
                console.log("No authenticated user, showing auth wall");
                this.showAuthWall();
            }
        }, error => {
            console.error("Auth state error:", error);
            this.handleError("Authentication error");
        });
    }

    // Show the authentication wall
    showAuthWall() {
        const authWall = document.getElementById('authWall');
        if (!authWall) {
            this.handleError("Authentication wall element not found");
            return;
        }

        authWall.style.display = 'flex';
        
        // Set up PIN submission
        const pinInput = document.getElementById('pinInput');
        const submitBtn = document.getElementById('submitPin');
        
        if (!pinInput || !submitBtn) {
            this.handleError("PIN input elements not found");
            return;
        }

        const submitHandler = () => {
            const pin = pinInput.value.trim();
            if (!pin) {
                this.showPinError("Please enter a PIN");
                return;
            }
            this.verifyPin(pin);
        };

        submitBtn.addEventListener('click', submitHandler);
        pinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitHandler();
        });
    }

    // Verify PIN with Firebase
    async verifyPin(pin) {
        const pinError = document.getElementById('pinError');
        if (pinError) pinError.style.display = 'none';
        
        this.showLoading(true);

        try {
            // Check if PIN exists in Firestore
            const querySnapshot = await this.db.collection("validPins")
                .where("pin", "==", pin)
                .get();

            if (querySnapshot.empty) {
                throw new Error("Invalid PIN");
            }

            // PIN is valid - store it and sign in
            localStorage.setItem('betSmartAuth', pin);
            document.getElementById('authWall').style.display = 'none';
            
            // Sign in anonymously
            await this.auth.signInAnonymously();
            this.trackAccess(pin);
            
            // Initialize the app
            this.initApp();
        } catch (error) {
            console.error("PIN verification failed:", error);
            this.showLoading(false);
            this.showPinError(error.message || "Invalid PIN");
        }
    }

    // Initialize the main application
    async initApp() {
        if (this.initialized) return;
        
        this.showLoading(true);
        document.getElementById('appContent').style.display = 'none';

        try {
            // Load data from JSON file
            await this.loadData();
            
            // Initialize UI
            this.render();
            this.setupEventListeners();
            this.checkDarkMode();
            
            // Show the app content
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('appContent').style.display = 'block';
            
            this.initialized = true;
            console.log("App initialized successfully");
        } catch (error) {
            console.error("App initialization failed:", error);
            this.handleError("Failed to initialize application");
        }
    }

    // Load data from JSON file
    async loadData() {
        try {
            const dataUrl = this.getDataUrl();
            console.log("Loading data from:", dataUrl);
            
            const response = await fetch(dataUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Data loaded:", data);
            
            if (!data.bets || !Array.isArray(data.bets)) {
                throw new Error("Invalid data format: bets array missing");
            }
            
            // Filter and validate bets
            this.bets = data.bets.filter(bet => 
                bet.id &&
                bet.event && 
                bet.event.trim() && 
                bet.mainBet && 
                bet.mainBet.pick
            );
            
            // Validate game data or use defaults
            this.gameData = data.gameData || this.getDefaultGameData();
            
            // Ensure current day bet exists
            if (!this.gameData.bets.some(b => b.day === this.gameData.currentDay)) {
                this.resetGame();
            }
            
            console.log(`Loaded ${this.bets.length} valid bets`);
        } catch (error) {
            console.error("Data load failed:", error);
            
            // Only use defaults if we can't load the file
            if (error.message.includes("Failed to fetch")) {
                alert("Warning: Using demo data as we couldn't load your bets file");
                this.bets = this.getDefaultBets();
                this.gameData = this.getDefaultGameData();
            }
            
            throw error;
        }
    }

    // Get the correct data URL based on environment
    getDataUrl() {
        // For local development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return '/data/bets.json';
        }
        // For GitHub Pages
        if (window.location.host.includes('github.io')) {
            return '/aurabetz-client/data/bets.json';
        }
        // Default case
        return 'data/bets.json';
    }

    // Render the bets grid
    render() {
        const filteredBets = this.filterAndSortBets();
        const container = document.getElementById('betsContainer');
        
        if (!container) {
            console.error("Bets container not found");
            return;
        }
        
        container.innerHTML = filteredBets.length === 0
            ? '<div class="no-results">No betting opportunities match your current filters.</div>'
            : filteredBets.map(bet => this.createBetCard(bet)).join('');
        
        // Add click handlers to bet cards
        document.querySelectorAll('.bet-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('view-analysis-btn')) {
                    const betId = parseInt(card.dataset.betId);
                    if (!isNaN(betId)) this.showBetDetails(betId);
                }
            });
        });
    }

    // Create a bet card element
    createBetCard(bet) {
        if (!bet || !bet.mainBet) return '';
        
        const valueClass = this.getValueClass(bet.mainBet.value);
        const confidenceClass = this.getConfidenceClass(bet.mainBet.confidence);
        
        return `
            <div class="bet-card" data-bet-id="${bet.id}">
                <div class="bet-card-content">
                    <div class="bet-info-icon">
                        <i class="fas fa-info-circle text-primary"></i>
                    </div>
                    <div class="bet-header">
                        <span class="bet-sport">${bet.sport || 'Unknown'}</span>
                        <span class="bet-time">${this.formatDate(bet.time)}</span>
                    </div>
                    <h3 class="bet-title">${bet.event}</h3>
                    <div class="bet-main">
                        <div class="bet-type-row">
                            <span class="bet-type">${bet.mainBet.type || 'Unknown'}</span>
                            ${bet.mainBet.value ? `
                            <span class="bet-value ${valueClass}">
                                Value: ${(bet.mainBet.value * 100).toFixed(0)}%
                            </span>` : ''}
                        </div>
                        <div class="bet-selection-row">
                            <div class="bet-pick-container">
                                <div class="bet-pick">${bet.mainBet.pick}</div>
                                ${bet.mainBet.odds ? `
                                <div class="bet-odds ${valueClass}">
                                    ${this.formatOdds(bet.mainBet.odds)}
                                </div>` : ''}
                            </div>
                            <span class="confidence-badge ${confidenceClass}">
                                ${bet.mainBet.confidence || 'Medium'} Confidence
                            </span>
                        </div>
                    </div>
                    <div class="bet-footer">
                        ${this.getBestOdds(bet.sportsbooks) ? `
                        <span class="best-odds">
                            Best Odds: ${this.getBestOdds(bet.sportsbooks)}
                        </span>` : ''}
                        <button class="view-analysis-btn">View Analysis</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Show detailed view for a bet
    showBetDetails(betId) {
        const bet = this.bets.find(b => b.id === betId);
        if (!bet) return;

        const modal = document.getElementById('detailModal');
        const title = document.getElementById('modalTitle');
        const content = document.getElementById('modalContent');
        
        if (!modal || !title || !content) return;
        
        title.textContent = bet.event;
        content.innerHTML = this.createBetDetailsHtml(bet);
        modal.classList.add('active');
    }

    // Create HTML for bet details modal
    createBetDetailsHtml(bet) {
        const confidenceClass = this.getConfidenceClass(bet.mainBet.confidence);
        const valueClass = this.getValueClass(bet.mainBet.value);
        
        return `
            <div class="modal-section">
                <div class="modal-header-row">
                    <div class="bet-meta">
                        <span class="modal-sport">${bet.sport}</span>
                        <span class="modal-time">${this.formatDate(bet.time)}</span>
                    </div>
                    <span class="modal-confidence ${confidenceClass}">
                        ${bet.mainBet.confidence || 'Medium'} Confidence
                    </span>
                </div>
                
                <div class="main-bet-highlight">
                    <div class="bet-meta-row">
                        <span class="bet-type-label">${bet.mainBet.type}</span>
                        ${bet.mainBet.value ? `
                        <span class="value-badge ${valueClass}">
                            Value: ${(bet.mainBet.value * 100).toFixed(0)}%
                        </span>` : ''}
                    </div>
                    <div class="bet-selection-row">
                        <div class="bet-pick">${bet.mainBet.pick}</div>
                        ${bet.mainBet.odds ? `
                        <div class="bet-odds ${valueClass}">
                            ${this.formatOdds(bet.mainBet.odds)}
                        </div>` : ''}
                    </div>
                    ${bet.mainBet.probability ? `
                    <div class="implied-prob">
                        Implied Probability: ${(bet.mainBet.probability * 100).toFixed(0)}%
                    </div>` : ''}
                </div>
            </div>

            <div class="modal-grid">
                <div class="modal-column">
                    <h3 class="modal-subtitle">Other Opportunities</h3>
                    <div class="other-bets-container">
                        ${bet.otherBets?.length ? bet.otherBets.map(ob => `
                            <div class="other-bet-row">
                                <div class="other-bet-info">
                                    <span class="other-bet-type">${ob.type}: ${ob.pick}</span>
                                    ${ob.odds ? `
                                    <span class="other-bet-odds">
                                        ${this.formatOdds(ob.odds)}
                                    </span>` : ''}
                                </div>
                                ${ob.value ? `
                                <div class="other-bet-value ${this.getValueClass(ob.value)}">
                                    Value: ${(ob.value * 100).toFixed(0)}%
                                </div>` : ''}
                            </div>
                        `).join('') : '<p class="no-other-bets">No additional bets available</p>'}
                    </div>
                </div>
                
                <div class="modal-column">
                    <h3 class="modal-subtitle">Odds Comparison</h3>
                    <div class="odds-comparison-container">
                        ${bet.sportsbooks?.length ? bet.sportsbooks
                            .filter(sb => sb.odds !== undefined && sb.odds !== null)
                            .map(sb => `
                                <div class="odds-comparison-row">
                                    <span>${sb.name}</span>
                                    <span class="odds-value">${this.formatOdds(sb.odds)}</span>
                                </div>
                            `).join('') : '<p class="no-odds">No odds comparison available</p>'}
                    </div>
                </div>
            </div>
            
            ${bet.analysis ? `
            <div class="modal-section">
                <h3 class="modal-subtitle">Summary</h3>
                <div class="analysis-container">
                    <p>${bet.analysis}</p>
                </div>
            </div>` : ''}
            
            ${bet.aiReasoning ? `
            <div class="modal-section">
                <h3 class="modal-subtitle ai-title">
                    <i class="fas fa-brain text-primary"></i>
                    AI Analysis
                </h3>
                <div class="ai-analysis-container">
                    <p>${bet.aiReasoning}</p>
                </div>
            </div>` : ''}
        `;
    }

    // Filter and sort bets based on current settings
    filterAndSortBets() {
        let bets = [...this.bets];
        
        // Filter by sport
        if (this.selectedSport !== 'All Sports') {
            bets = bets.filter(bet => bet.sport === this.selectedSport);
        }
        
        // Filter by value
        if (this.highValueOnly) {
            bets = bets.filter(bet => bet.mainBet.value >= 0.20);
        }
        
        // Sort based on current setting
        switch(this.sortBy) {
            case 'value':
                bets.sort((a, b) => (b.mainBet.value || 0) - (a.mainBet.value || 0));
                break;
            case 'odds':
                bets.sort((a, b) => (a.mainBet.odds || 0) - (b.mainBet.odds || 0));
                break;
            case 'confidence':
                const confidenceValues = { 'High': 3, 'Medium': 2, 'Low': 1 };
                bets.sort((a, b) => 
                    confidenceValues[b.mainBet.confidence || 'Medium'] - 
                    confidenceValues[a.mainBet.confidence || 'Medium']
                );
                break;
            case 'time':
                bets.sort((a, b) => {
                    const dateA = a.time ? new Date(a.time) : new Date(0);
                    const dateB = b.time ? new Date(b.time) : new Date(0);
                    return dateA - dateB;
                });
                break;
        }
        
        return bets;
    }

    // Set up all event listeners
    setupEventListeners() {
        // Sport tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.selectedSport = tab.dataset.sport;
                this.updateActiveTab();
                this.render();
            });
        });
        
        // Sort dropdown
        document.getElementById('sortOptions')?.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.render();
        });
        
        // High value filter
        document.getElementById('highValueOnly')?.addEventListener('change', (e) => {
            this.highValueOnly = e.target.checked;
            this.render();
        });
        
        // Dark mode toggle
        document.getElementById('darkModeToggle')?.addEventListener('click', () => {
            this.toggleDarkMode();
        });
        
        // Modals
        document.getElementById('closeModal')?.addEventListener('click', () => {
            document.getElementById('detailModal')?.classList.remove('active');
        });
        
        document.getElementById('theGameBtn')?.addEventListener('click', () => {
            this.showGameModal();
        });
        
        // View analysis buttons (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-analysis-btn')) {
                const card = e.target.closest('.bet-card');
                if (card) {
                    const betId = parseInt(card.dataset.betId);
                    if (!isNaN(betId)) this.showBetDetails(betId);
                }
            }
        });
    }

    // Update active tab styling
    updateActiveTab() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('tab-active', tab.dataset.sport === this.selectedSport);
            tab.classList.toggle('tab-inactive', tab.dataset.sport !== this.selectedSport);
        });
    }

    // Show/hide loading spinner
    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) spinner.style.display = show ? 'flex' : 'none';
    }

    // Show PIN error message
    showPinError(message) {
        const errorElement = document.getElementById('pinError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    // Handle application errors
    handleError(message) {
        console.error("Application error:", message);
        const spinner = document.getElementById('loadingSpinner');
        
        if (spinner) {
            spinner.innerHTML = `
                <div class="spinner-content">
                    <i class="fas fa-exclamation-triangle" style="color: red;"></i>
                    <p style="color: red;">${message}</p>
                    <button onclick="window.location.reload()">Refresh</button>
                </div>`;
        }
    }

    // Utility methods
    formatOdds(odds) {
        return odds > 0 ? `+${odds}` : odds;
    }

    formatDate(dateString) {
        if (!dateString) return 'TBD';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return 'TBD';
        }
    }

    getValueClass(value) {
        if (!value) return "value-low";
        if (value >= 0.25) return "value-high";
        if (value >= 0.15) return "value-medium";
        return "value-low";
    }

    getConfidenceClass(confidence) {
        switch (confidence) {
            case "High": return "confidence-high";
            case "Medium": return "confidence-medium";
            default: return "confidence-low";
        }
    }

    getBestOdds(sportsbooks) {
        if (!sportsbooks?.length) return null;
        const validOdds = sportsbooks.filter(sb => sb.odds != null);
        if (!validOdds.length) return null;
        const best = Math.max(...validOdds.map(sb => sb.odds));
        return this.formatOdds(best);
    }

    // Default data fallbacks
    getDefaultBets() {
        return [
            {
                id: 1,
                sport: "UFC",
                event: "Jon Jones vs Stipe Miocic",
                time: "2023-11-12T03:00:00Z",
                mainBet: {
                    type: "Moneyline",
                    pick: "Jon Jones",
                    odds: -180,
                    probability: 0.75,
                    value: 0.25,
                    confidence: "High"
                },
                otherBets: [],
                analysis: "Default analysis...",
                aiReasoning: "Default AI reasoning...",
                sportsbooks: [
                    { name: "DraftKings", odds: -180 },
                    { name: "FanDuel", odds: -175 },
                    { name: "BetMGM", odds: -185 }
                ]
            }
        ];
    }

    getDefaultGameData() {
        return {
            currentDay: 1,
            completedDays: 0,
            startingAmount: 10,
            currentAmount: 10,
            bets: [
                {
                    day: 1,
                    sport: "UFC",
                    event: "Jon Jones vs Stipe Miocic",
                    bet: "Jon Jones",
                    betType: "Moneyline",
                    odds: -180,
                    amount: 10,
                    potentialProfit: 15,
                    completed: false,
                    won: null
                }
            ]
        };
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Show loading state
        document.getElementById('appContent').style.display = 'none';
        document.getElementById('authWall').style.display = 'none';
        document.getElementById('loadingSpinner').style.display = 'flex';
        
        // Start the app
        new BetSmartApp();
    } catch (error) {
        console.error("Initialization error:", error);
        document.getElementById('loadingSpinner').innerHTML = `
            <div class="spinner-content">
                <i class="fas fa-exclamation-triangle" style="color: red;"></i>
                <p style="color: red;">Failed to initialize application</p>
                <button onclick="window.location.reload()">Try Again</button>
            </div>`;
    }
});
