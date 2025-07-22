// BetSmart App - Complete Management System
class BetSmartApp {
    constructor() {
        this.bets = [];
        this.gameData = {};
        this.selectedSport = 'All Sports';
        this.sortBy = 'time'; // Changed default to 'time' for chronological sorting
        this.highValueOnly = false;
        this.DATA_URL = this.resolveDataUrl();
        this.isMaintenanceMode = false;
        
        // Initialize Firebase
        this.firebaseConfig = {
            apiKey: "AIzaSyDalVcdFUamoA90pSvNX2hfIkyH7hMZk9I",
            authDomain: "aurabetz.firebaseapp.com",
            projectId: "aurabetz1",
            storageBucket: "aurabetz.firebasestorage.app",
            messagingSenderId: "531651661385",
            appId: "1:531651661385:web:d82a50a33bb77297b7f998",
            measurementId: "G-7L19JWBH21"
        };
        
        this.app = firebase.initializeApp(this.firebaseConfig);
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        
        this.initAuth();
    }

    async checkMaintenanceMode() {
        try {
            const doc = await this.db.collection('settings').doc('maintenance').get();
            if (doc.exists && doc.data().isEnabled) {
                this.isMaintenanceMode = true;
                const maintenanceWall = document.getElementById('maintenanceWall');
                const appContent = document.getElementById('appContent');
                const authWall = document.getElementById('authWall');
                
                if (maintenanceWall) maintenanceWall.style.display = 'flex';
                if (appContent) appContent.style.display = 'none';
                if (authWall) authWall.style.display = 'none';
            }
        } catch (error) {
            console.error("Error checking maintenance mode:", error);
        }
    }

    initAuth() {
        this.checkMaintenanceMode().then(() => {
            if (this.isMaintenanceMode) return;

            this.auth.signOut().finally(() => {
                try {
                    const authTimeout = setTimeout(() => {
                        this.handleAuthError(new Error("Authentication timed out. Please check your connection."));
                    }, 8000);

                    this.auth.onAuthStateChanged((user) => {
                        clearTimeout(authTimeout);
                        document.getElementById('loadingSpinner').style.display = 'none';

                        if (user) {
                            document.getElementById('authWall').style.display = 'none';
                            this.initApp();
                        } else {
                            this.setupAuthForms();
                            document.getElementById('authWall').style.display = 'flex';
                        }
                    });
                } catch (error) {
                    this.handleAuthError(error);
                }
            });
        });
    }

    setupAuthForms() {
        document.getElementById('signInBtn')?.addEventListener('click', () => this.handleEmailSignIn());
        document.getElementById('signUpBtn')?.addEventListener('click', () => this.handleEmailSignUp());
    }

    handleEmailSignIn() {
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        if (!email || !password) {
            this.showAuthError("Email and password are required.");
            return;
        }
        this.auth.signInWithEmailAndPassword(email, password)
            .catch(error => this.showAuthError(error.message));
    }

    handleEmailSignUp() {
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        if (!email || !password) {
            this.showAuthError("Email and password are required.");
            return;
        }
        this.auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                const user = userCredential.user;
                return this.db.collection('users').doc(user.uid).set({
                    email: user.email,
                    isSubscribed: false,
                    subscriptionEnd: null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .catch(error => this.showAuthError(error.message));
    }

    showAuthError(message) {
        const errorDiv = document.getElementById('authError');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    initApp() {
        this.init();
        document.getElementById('appContent').style.display = 'block';
    }

    trackAccess(pin) {
        try {
            if (window.location.hostname !== 'localhost') {
                this.db.collection("accessLogs").add({
                    pin: "****" + pin.slice(-2),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    error: null,
                    success: true
                }).catch((err) => {
                    console.error("Firestore write failed:", err);
                });
            }
        } catch (error) {
            console.error("Tracking failed (non-critical):", error);
        }
    }

    handleAuthError(error) {
        console.error("Auth error:", error);
        const spinner = document.getElementById('loadingSpinner');
        
        if (spinner) {
            spinner.innerHTML = `
                <div class="spinner-content">
                    <i class="fas fa-exclamation-triangle" style="color: red; font-size: 2rem;"></i>
                    <p style="color: red; margin-top: 20px;">
                        Error loading BetSmart
                    </p>
                    <p style="color: #6c757d; font-size: 0.9rem; margin-top: 10px;">${error.message}</p>
                    <button onclick="window.location.reload()"
                            style="margin-top: 15px; padding: 8px 16px;
                                   background: var(--primary); color: white;
                                   border: none; border-radius: 4px; cursor: pointer;">
                        Refresh Page
                    </button>
                </div>`;
            spinner.style.display = 'flex';
        }
    }

    resolveDataUrl() {
        try {
            if (this.isGitHubPages()) {
                return '/aurabetz-1.0/data/bets.json'; 
            }
            return 'data/bets.json';
        } catch (e) {
            console.error('Path resolution error, using fallback', e);
            return 'data/bets.json';
        }
    }

    isGitHubPages() {
        return window.location.host.includes('github.io');
    }

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

    init() {
        try {
            this.loadData().then(() => {
                this.render();
                this.setupEventListeners();
                this.checkDarkMode();
            }).catch((err) => {
                this.handleAuthError(err);
            });
        } catch (error) {
            this.handleAuthError(error);
        }
    }

    async loadData() {
        try {
            const response = await fetch(this.DATA_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            // Enhanced validation for bets
            this.bets = (data.bets || this.getDefaultBets()).filter(bet => {
                const isValid = typeof bet.id === 'number' && 
                               bet.event && 
                               bet.event.trim() !== "" && 
                               bet.mainBet && 
                               bet.mainBet.pick &&
                               (bet.mainBet.probability === undefined || 
                                (typeof bet.mainBet.probability === 'number' && bet.mainBet.probability <= 1));
                
                // Convert percentage probabilities to decimal if needed
                if (isValid && bet.mainBet.probability > 1) {
                    bet.mainBet.probability = bet.mainBet.probability / 100;
                }
                
                return isValid;
            });
            
            // Validate game data
            this.gameData = data.gameData || this.getDefaultGameData();
            
            // Ensure current day bet exists
            const currentDayBet = this.gameData.bets.find(b => b.day === this.gameData.currentDay);
            if (!currentDayBet) {
                this.resetGame();
            }
        } catch (error) {
            console.error("Data load failed, using defaults:", error);
            this.bets = this.getDefaultBets();
            this.gameData = this.getDefaultGameData();
            alert("Warning: Using demo data. Some features may be limited.");
        }
        this.render();
    }

    render() {
        this.renderBets(this.filterAndSortBets());
        this.renderWinLossCounter();
    }

    renderWinLossCounter() {
        const wins = this.bets.filter(bet => bet.event.toUpperCase().includes('WON')).length;
        const losses = this.bets.filter(bet => bet.event.toUpperCase().includes('LOSS')).length;

        const counterElement = document.getElementById('winLossCounter');
        if (counterElement) {
            counterElement.innerHTML = `
                <span class="win-count">${wins} W</span> / <span class="loss-count">${losses} L</span>
            `;
        }
    }

    setupEventListeners() {
        document.getElementById('darkModeToggle')?.addEventListener('click', () => this.toggleDarkMode());
        document.getElementById('subscribeBtn')?.addEventListener('click', () => this.showSubscribeModal());

        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.selectedSport = e.target.getAttribute('data-sport');
                this.updateActiveSportTab();
                this.renderBets(this.filterAndSortBets());
            });
        });

        document.getElementById('sortOptions')?.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.renderBets(this.filterAndSortBets());
        });

        document.getElementById('highValueOnly')?.addEventListener('change', (e) => {
            this.highValueOnly = e.target.checked;
            this.renderBets(this.filterAndSortBets());
        });

        document.getElementById('closeModal')?.addEventListener('click', () => this.hideDetailModal());
        document.getElementById('detailModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('detailModal')) {
                this.hideDetailModal();
            }
        });

        document.getElementById('theGameBtn')?.addEventListener('click', () => {
            this.showGameModal();
            this.updateGameProgress();
        });
        document.getElementById('closeGameModal')?.addEventListener('click', () => this.hideGameModal());
        document.getElementById('gameModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('gameModal')) {
                this.hideGameModal();
            }
        });

        document.getElementById('closeSubscribeModal')?.addEventListener('click', () => this.hideSubscribeModal());
        document.getElementById('subscribeModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('subscribeModal')) {
                this.hideSubscribeModal();
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-analysis-btn')) {
                const card = e.target.closest('.bet-card');
                const betId = parseInt(card.getAttribute('data-bet-id'));
                this.showDetailModal(betId);
                e.stopPropagation();
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('payment-select-btn')) {
                const paymentMethod = e.target.closest('.payment-option').querySelector('h3').textContent;
                alert(`Selected ${paymentMethod}. Payment processing would be implemented here.`);
                this.hideSubscribeModal();
            }
        });

        document.querySelectorAll('.diamond').forEach(diamond => {
            diamond.addEventListener('click', (e) => {
                const day = parseInt(e.currentTarget.getAttribute('data-day'));
                if (day === this.gameData.currentDay) {
                    this.completeCurrentDay(true);
                }
            });
        });
    }

    showSubscribeModal() {
        document.getElementById('subscribeModal')?.classList.add('active');
    }

    hideSubscribeModal() {
        document.getElementById('subscribeModal')?.classList.remove('active');
    }

    filterAndSortBets() {
        let filteredBets = [...this.bets];
        
        if (this.selectedSport !== 'All Sports') {
            filteredBets = filteredBets.filter(bet => bet.sport === this.selectedSport);
        }
        
        if (this.highValueOnly) {
            filteredBets = filteredBets.filter(bet => bet.mainBet.value >= 0.20);
        }
        
        // Updated sorting logic - now defaults to newest first
        switch(this.sortBy) {
            case 'value':
                filteredBets.sort((a, b) => (b.mainBet.value || 0) - (a.mainBet.value || 0));
                break;
            case 'odds':
                filteredBets.sort((a, b) => (a.mainBet.odds || 0) - (b.mainBet.odds || 0));
                break;
            case 'confidence':
                const confidenceMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
                filteredBets.sort((a, b) => 
                    confidenceMap[b.mainBet.confidence || 'Medium'] - 
                    confidenceMap[a.mainBet.confidence || 'Medium']
                );
                break;
            case 'time':
            default:
                filteredBets.sort((a, b) => {
                    const dateA = a.time ? new Date(a.time) : new Date(0);
                    const dateB = b.time ? new Date(b.time) : new Date(0);
                    return dateB - dateA; // Changed to dateB - dateA for newest first
                });
                break;
        }
        
        return filteredBets;
    }

    renderBets(betsToRender) {
        const container = document.getElementById('betsContainer');
        if (!container) return;
        
        container.innerHTML = '';

        if (betsToRender.length === 0) {
            container.innerHTML = '<div class="no-results">No betting opportunities match your current filters.</div>';
            return;
        }

        betsToRender.forEach(bet => {
            const card = this.createBetCard(bet);
            if (card.childNodes.length > 0) {
                container.appendChild(card);
            }
        });

        document.querySelectorAll('.bet-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const betId = parseInt(card.getAttribute('data-bet-id'));
                this.showDetailModal(betId);
            });
        });
    }

    createBetCard(bet) {
        if (!bet.event || !bet.mainBet || !bet.mainBet.pick) {
            return document.createElement('div');
        }

        const valueClass = this.getValueClass(bet.mainBet.value || 0);
        const confidenceBadgeClass = this.getConfidenceBadgeClass(bet.mainBet.confidence || "Medium");
        
        const card = document.createElement('div');
        card.className = 'bet-card';
        card.setAttribute('data-bet-id', bet.id);

        let eventTitle = bet.event;
        if (bet.event.toUpperCase().includes('WON')) {
            card.classList.add('bet-card-won');
            eventTitle = eventTitle.replace(/\(COMPLETED - WON\)/ig, '').trim();
        } else if (bet.event.toUpperCase().includes('LOSS')) {
            card.classList.add('bet-card-loss');
            eventTitle = eventTitle.replace(/\(COMPLETED - LOSS\)/ig, '').trim();
        }
        
        card.innerHTML = `
            <div class="bet-card-content">
                <div class="bet-info-icon">
                    <i class="fas fa-info-circle text-primary"></i>
                </div>
                <div class="bet-header">
                    <span class="bet-sport">${bet.sport || 'Unknown Sport'}</span>
                    <span class="bet-time">${this.formatDate(bet.time)}</span>
                </div>
                <h3 class="bet-title">${eventTitle}</h3>
                <div class="bet-main">
                    <div class="bet-type-row">
                        <span class="bet-type">${bet.mainBet.type || 'Unknown Type'}</span>
                        ${bet.mainBet.value ? `<span class="bet-value ${valueClass}">Value: ${(bet.mainBet.value * 100).toFixed(0)}%</span>` : ''}
                    </div>
                    <div class="bet-selection-row">
                        <div class="bet-pick-container">
                            <div class="bet-pick">${bet.mainBet.pick}</div>
                            ${bet.mainBet.odds ? `<div class="bet-odds ${valueClass}">${this.formatAmericanOdds(bet.mainBet.odds)}</div>` : ''}
                        </div>
                        <span class="confidence-badge ${confidenceBadgeClass}">${bet.mainBet.confidence || 'Medium'} Confidence</span>
                    </div>
                </div>
                <div class="bet-footer">
                    ${this.getBestOdds(bet.sportsbooks) ? `<span class="best-odds">Best Odds: ${this.getBestOdds(bet.sportsbooks)}</span>` : ''}
                    <button class="view-analysis-btn">View Analysis</button>
                </div>
            </div>
        `;
        
        return card;
    }

    getBestOdds(sportsbooks) {
        if (!sportsbooks || sportsbooks.length === 0) return null;
        const validOdds = sportsbooks.filter(sb => sb.odds !== null && sb.odds !== undefined);
        if (validOdds.length === 0) return null;
        const bestOdds = Math.max(...validOdds.map(sb => sb.odds));
        return this.formatAmericanOdds(bestOdds);
    }

    updateActiveSportTab() {
        const sportTabs = document.querySelectorAll('.tab');
        sportTabs.forEach(tab => {
            const sport = tab.getAttribute('data-sport');
            tab.classList.remove('tab-active');
            tab.classList.add('tab-inactive');
            
            if (sport === this.selectedSport) {
                tab.classList.remove('tab-inactive');
                tab.classList.add('tab-active');
            }
        });
    }

    showDetailModal(betId) {
        const bet = this.bets.find(b => b.id === betId);
        if (!bet) return;

        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        
        if (!modalTitle || !modalContent) return;
        
        modalTitle.textContent = bet.event;
        
        const sportsBookComparison = bet.sportsbooks 
            ? bet.sportsbooks.filter(sb => sb.odds !== null && sb.odds !== undefined)
                .map(sb => `
                    <div class="odds-comparison-row">
                        <span>${sb.name}</span>
                        <span class="odds-value">${this.formatAmericanOdds(sb.odds)}</span>
                    </div>`
                ).join('')
            : '<p class="no-odds">No odds comparison available</p>';

        const otherBetsHtml = bet.otherBets && bet.otherBets.length > 0
            ? bet.otherBets.map(ob => `
                <div class="other-bet-row">
                    <div class="other-bet-info">
                        <span class="other-bet-type">${ob.type || 'Unknown'}: ${ob.pick || 'Unknown'}</span>
                        ${ob.odds ? `<span class="other-bet-odds">${this.formatAmericanOdds(ob.odds)}</span>` : ''}
                    </div>
                    ${ob.value ? `<div class="other-bet-value ${this.getValueClass(ob.value)}">Value: ${(ob.value * 100).toFixed(0)}%</div>` : ''}
                </div>`
            ).join('')
            : '<p class="no-other-bets">No additional bets available</p>';

        const confidenceBadgeClass = this.getConfidenceBadgeClass(bet.mainBet.confidence || "Medium");

        modalContent.innerHTML = `
            <div class="modal-top-info">
                <span class="modal-sport">${bet.sport || 'Unknown Sport'}</span>
                <span class="modal-time">${this.formatDate(bet.time)}</span>
                <span class="modal-confidence ${confidenceBadgeClass}">${bet.mainBet.confidence || 'Medium'} Confidence</span>
            </div>

            <div class="modal-main-grid">
                <div class="modal-main-bet-col">
                    <h3 class="modal-subtitle">Main Bet</h3>
                    <div class="main-bet-box">
                        <div class="main-bet-type">${bet.mainBet.type || 'Unknown Type'}</div>
                        <div class="main-bet-pick">${bet.mainBet.pick}</div>
                        <div class="main-bet-odds">${this.formatAmericanOdds(bet.mainBet.odds)}</div>
                        ${bet.mainBet.probability ? `
                        <div class="implied-prob">
                            Implied Probability: ${(bet.mainBet.probability * 100).toFixed(0)}%
                        </div>` : ''}
                    </div>
                </div>
                <div class="modal-analysis-col">
                    <h3 class="modal-subtitle">Analysis</h3>
                    <div class="analysis-container">
                        <p>${bet.analysis || 'No analysis available.'}</p>
                        ${bet.aiReasoning ? `<p><strong>AI Reasoning:</strong> ${bet.aiReasoning}</p>` : ''}
                    </div>
                </div>
            </div>

            <div class="modal-secondary-grid">
                <div class="modal-secondary-col">
                    <h3 class="modal-subtitle">Other Opportunities</h3>
                    <div class="other-bets-container">
                        ${otherBetsHtml}
                    </div>
                </div>
                <div class="modal-secondary-col">
                    <h3 class="modal-subtitle">Odds Comparison</h3>
                    <div class="odds-comparison-container">
                        ${sportsBookComparison}
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('detailModal')?.classList.add('active');
    }

    hideDetailModal() {
        document.getElementById('detailModal')?.classList.remove('active');
    }

    showGameModal() {
        document.getElementById('gameModal')?.classList.add('active');
    }

    hideGameModal() {
        document.getElementById('gameModal')?.classList.remove('active');
    }

    updateGameProgress() {
        document.querySelectorAll('.diamond').forEach(diamond => {
            const day = parseInt(diamond.getAttribute('data-day'));
            diamond.style.backgroundColor = '';
            diamond.querySelector('span').style.color = '';
            
            if (day < this.gameData.currentDay) {
                diamond.style.backgroundColor = 'var(--secondary)';
                diamond.querySelector('span').style.color = 'var(--white)';
            } else if (day === this.gameData.currentDay) {
                diamond.style.backgroundColor = 'var(--primary)';
                diamond.querySelector('span').style.color = 'var(--white)';
            } else {
                diamond.style.backgroundColor = 'var(--gray-200)';
                diamond.querySelector('span').style.color = 'var(--gray-700)';
                
                if (document.body.classList.contains('dark')) {
                    diamond.style.backgroundColor = 'var(--gray-700)';
                    diamond.querySelector('span').style.color = 'var(--gray-300)';
                }
            }
        });
    }

    completeCurrentDay(won = true) {
        const currentBet = this.gameData.bets.find(bet => bet.day === this.gameData.currentDay);
        
        if (currentBet && !currentBet.completed) {
            currentBet.completed = true;
            currentBet.won = won;
            
            if (won) {
                this.gameData.currentAmount += currentBet.potentialProfit;
                this.gameData.completedDays++;
                this.gameData.currentDay++;
                
                const diamond = document.querySelector(`.diamond[data-day="${this.gameData.currentDay - 1}"]`);
                if (diamond) {
                    diamond.classList.add('diamond-pulse');
                    setTimeout(() => {
                        diamond.classList.remove('diamond-pulse');
                    }, 1500);
                }
                
                if (this.gameData.currentDay <= 9) {
                    this.gameData.bets.push({
                        day: this.gameData.currentDay,
                        sport: ['NHL', 'NBA', 'UFC', 'Soccer', 'Table Tennis'][Math.floor(Math.random() * 5)],
                        event: "Next Game TBD",
                        bet: "TBD",
                        betType: "TBD",
                        odds: +130,
                        amount: this.gameData.currentAmount,
                        potentialProfit: (this.gameData.currentAmount * 1.3).toFixed(2),
                        completed: false,
                        won: null
                    });
                }
            } else {
                alert("Sorry! You lost today's bet. The Game is over. You can restart from Day 1.");
                this.resetGame();
            }
            
            this.updateGameProgress();
        }
    }

    resetGame() {
        this.gameData.currentDay = 1;
        this.gameData.completedDays = 0;
        this.gameData.currentAmount = this.gameData.startingAmount;
        
        this.gameData.bets = [{
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
        }];
        
        this.updateGameProgress();
    }

    toggleDarkMode() {
        document.body.classList.toggle('dark');
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            const moonIcon = darkModeToggle.querySelector('.fa-moon');
            const sunIcon = darkModeToggle.querySelector('.fa-sun');
            
            moonIcon.classList.toggle('hidden');
            sunIcon.classList.toggle('hidden');
        }
    }

    checkDarkMode() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark');
            const darkModeToggle = document.getElementById('darkModeToggle');
            if (darkModeToggle) {
                const moonIcon = darkModeToggle.querySelector('.fa-moon');
                const sunIcon = darkModeToggle.querySelector('.fa-sun');
                
                moonIcon.classList.add('hidden');
                sunIcon.classList.remove('hidden');
            }
        }
        
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
            if (event.matches) {
                document.body.classList.add('dark');
            } else {
                document.body.classList.remove('dark');
            }
        });
    }

    formatAmericanOdds(odds) {
        if (odds === null || odds === undefined) return 'N/A';
        return odds > 0 ? `+${odds}` : odds;
    }

    getValueClass(value) {
        if (!value) return "value-low";
        if (value >= 0.25) return "value-high";
        if (value >= 0.15) return "value-medium";
        return "value-low";
    }

    getConfidenceBadgeClass(confidence) {
        switch (confidence) {
            case "High": return "confidence-high";
            case "Medium": return "confidence-medium";
            default: return "confidence-low";
        }
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
        } catch (e) {
            return 'TBD';
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const spinner = document.getElementById('loadingSpinner');
    const appContent = document.getElementById('appContent');

    if(spinner) spinner.style.display = 'flex';
    if(appContent) appContent.style.display = 'none';

    try {
        const app = new BetSmartApp();
    } catch (error) {
        console.error("Failed to initialize BetSmartApp:", error);
        if (spinner) {
            spinner.innerHTML = `
                <div class="spinner-content">
                    <i class="fas fa-exclamation-triangle" style="color: red; font-size: 2rem;"></i>
                    <p style="color: red; margin-top: 20px;">
                        Fatal Error: Could not start the application.
                    </p>
                    <p style="color: #666; font-size: 0.9em; margin-top: 10px;">${error.message}</p>
                </div>`;
        }
    }
});
