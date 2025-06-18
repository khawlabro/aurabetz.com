// BetSmart App - Main application class
class BetSmartApp {
    // Add these right after the class declaration but before constructor
const firebaseConfig = {
  apiKey: "AIzaSyCzXxF1HkUYB6EJq5jAVz8X3pM4NkPg8iA",
  authDomain: "aurabetz.firebaseapp.com",
  projectId: "aurabetz",
  storageBucket: "aurabetz.firebasestorage.app",
  messagingSenderId: "531651661385",
  appId: "1:531651661385:web:d82a50a33bb77297b7f998",
  measurementId: "G-7L19JWBH21"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
    
    constructor() {
    this.bets = [];
    this.gameData = {};
    this.selectedSport = 'All Sports';
    this.sortBy = 'value';
    this.highValueOnly = false;
    this.DATA_URL = this.resolveDataUrl();
    this.validPins = ["123456", "654321"]; // Add this line
        
        this.initAuth();
    }

    initAuth() {
    try {
        // Check if user is already authenticated
        const storedPin = localStorage.getItem('betSmartAuth');
        if (storedPin && this.validPins.includes(storedPin)) {
            this.initApp();
            return;
        }

        // Show auth wall
        const authWall = document.getElementById('authWall');
        if (!authWall) throw new Error("Auth wall element not found");
        authWall.style.display = 'flex';

        // PIN submission handler
        document.getElementById('submitPin').addEventListener('click', () => {
            const enteredPin = document.getElementById('pinInput').value;
            if (!enteredPin) {
                document.getElementById('pinError').textContent = "Please enter a PIN";
                document.getElementById('pinError').style.display = 'block';
                return;
            }

            if (this.validPins.includes(enteredPin)) {
                localStorage.setItem('betSmartAuth', enteredPin);
                authWall.style.display = 'none';
                this.trackAccess(enteredPin);
                this.initApp();
            } else {
                document.getElementById('pinError').textContent = "Invalid PIN";
                document.getElementById('pinError').style.display = 'block';
            }
        });

        // Enter key support
        document.getElementById('pinInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('submitPin').click();
        });

    } catch (error) {
        this.handleAuthError(error); // Call error handler
    }
}

    initApp() {
        this.init(); // Your original initialization
        document.getElementById('appContent').style.display = 'block';
    }

    trackAccess(pin) {
    try {
        // Only track in production (optional)
        if (window.location.hostname !== 'localhost') {
            db.collection("accessLogs").add({
                pin: "****" + pin.slice(-2), // Mask PIN for security
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                error: null,
                success: true
            }).catch((err) => {
                console.error("Firestore write failed:", err);
            });
        }
    } catch (error) {
        console.error("Tracking failed (non-critical):", error);
        // No UI impact - tracking is optional
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
                        Error loading BetSmart. Please refresh or check your connection.
                    </p>
                    <button onclick="window.location.reload()" 
                            style="margin-top: 10px; padding: 8px 16px; 
                                   background: var(--primary); color: white; 
                                   border: none; border-radius: 4px; cursor: pointer;">
                        Refresh Page
                    </button>
                </div>`;
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
        this.bets = data.bets || this.getDefaultBets();
        this.gameData = data.gameData || this.getDefaultGameData();
    } catch (error) {
        console.error("Data load failed, using defaults:", error);
        this.bets = this.getDefaultBets();
        this.gameData = this.getDefaultGameData();
        // Optional: Show user-friendly warning
        alert("Warning: Using demo data. Some features may be limited.");
    }
    this.render();
}

    render() {
        this.renderBets(this.filterAndSortBets());
    }

    setupEventListeners() {
        // Dark mode toggle
        document.getElementById('darkModeToggle')?.addEventListener('click', () => this.toggleDarkMode());

        // Subscribe button
        document.getElementById('subscribeBtn')?.addEventListener('click', () => this.showSubscribeModal());

        // Sport tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.selectedSport = e.target.getAttribute('data-sport');
                this.updateActiveSportTab();
                this.renderBets(this.filterAndSortBets());
            });
        });

        // Sort dropdown
        document.getElementById('sortOptions')?.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.renderBets(this.filterAndSortBets());
        });

        // High value checkbox
        document.getElementById('highValueOnly')?.addEventListener('change', (e) => {
            this.highValueOnly = e.target.checked;
            this.renderBets(this.filterAndSortBets());
        });

        // Modals
        document.getElementById('closeModal')?.addEventListener('click', () => this.hideDetailModal());
        document.getElementById('detailModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('detailModal')) {
                this.hideDetailModal();
            }
        });

        // The Game modal
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

        // Subscribe modal
        document.getElementById('closeSubscribeModal')?.addEventListener('click', () => this.hideSubscribeModal());
        document.getElementById('subscribeModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('subscribeModal')) {
                this.hideSubscribeModal();
            }
        });

        // View analysis buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-analysis-btn')) {
                const card = e.target.closest('.bet-card');
                const betId = parseInt(card.getAttribute('data-bet-id'));
                this.showDetailModal(betId);
                e.stopPropagation();
            }
        });

        // Payment selection buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('payment-select-btn')) {
                const paymentMethod = e.target.closest('.payment-option').querySelector('h3').textContent;
                alert(`Selected ${paymentMethod}. Payment processing would be implemented here.`);
                this.hideSubscribeModal();
            }
        });

        // Diamond clicks for The Game
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
        
        switch(this.sortBy) {
            case 'value':
                filteredBets.sort((a, b) => b.mainBet.value - a.mainBet.value);
                break;
            case 'odds':
                filteredBets.sort((a, b) => a.mainBet.odds - b.mainBet.odds);
                break;
            case 'confidence':
                const confidenceMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
                filteredBets.sort((a, b) => confidenceMap[b.mainBet.confidence] - confidenceMap[a.mainBet.confidence]);
                break;
            case 'time':
                filteredBets.sort((a, b) => new Date(a.time) - new Date(b.time));
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
            container.appendChild(card);
        });

        document.querySelectorAll('.bet-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const betId = parseInt(card.getAttribute('data-bet-id'));
                this.showDetailModal(betId);
            });
        });
    }

    createBetCard(bet) {
        const valueClass = this.getValueClass(bet.mainBet.value);
        const confidenceBadgeClass = this.getConfidenceBadgeClass(bet.mainBet.confidence);
        
        const card = document.createElement('div');
        card.className = 'bet-card';
        card.setAttribute('data-bet-id', bet.id);
        
        card.innerHTML = `
            <div class="bet-card-content">
                <div class="bet-info-icon">
                    <i class="fas fa-info-circle text-primary"></i>
                </div>
                <div class="bet-header">
                    <span class="bet-sport">${bet.sport}</span>
                    <span class="bet-time">${this.formatDate(bet.time)}</span>
                </div>
                <h3 class="bet-title">${bet.event}</h3>
                <div class="bet-main">
                    <div class="bet-type-row">
                        <span class="bet-type">${bet.mainBet.type}</span>
                        <span class="bet-value ${valueClass}">Value: ${(bet.mainBet.value * 100).toFixed(0)}%</span>
                    </div>
                    <div class="bet-selection-row">
                        <div class="bet-pick-container">
                            <div class="bet-pick">${bet.mainBet.pick}</div>
                            <div class="bet-odds ${valueClass}">${this.formatAmericanOdds(bet.mainBet.odds)}</div>
                        </div>
                        <span class="confidence-badge ${confidenceBadgeClass}">${bet.mainBet.confidence} Confidence</span>
                    </div>
                </div>
                <div class="bet-footer">
                    <span class="best-odds">Best Odds: ${this.formatAmericanOdds(Math.max(...bet.sportsbooks.map(sb => sb.odds)))}</span>
                    <button class="view-analysis-btn">View Analysis</button>
                </div>
            </div>
        `;
        
        return card;
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
        
        const sportsBookComparison = bet.sportsbooks.map(sb => 
            `<div class="odds-comparison-row">
                <span>${sb.name}</span>
                <span class="odds-value">${this.formatAmericanOdds(sb.odds)}</span>
            </div>`
        ).join('');

        const otherBetsHtml = bet.otherBets.map(ob => 
            `<div class="other-bet-row">
                <div class="other-bet-info">
                    <span class="other-bet-type">${ob.type}: ${ob.pick}</span>
                    <span class="other-bet-odds">${this.formatAmericanOdds(ob.odds)}</span>
                </div>
                <div class="other-bet-value ${this.getValueClass(ob.value)}">Value: ${(ob.value * 100).toFixed(0)}%</div>
            </div>`
        ).join('');

        const confidenceBadgeClass = this.getConfidenceBadgeClass(bet.mainBet.confidence);

        modalContent.innerHTML = `
            <div class="modal-section">
                <div class="modal-header-row">
                    <div class="bet-meta">
                        <span class="modal-sport">${bet.sport}</span>
                        <span class="modal-time">${this.formatDate(bet.time)}</span>
                    </div>
                    <span class="modal-confidence ${confidenceBadgeClass}">${bet.mainBet.confidence} Confidence</span>
                </div>
                
                <div class="main-bet-highlight">
                    <div class="bet-meta-row">
                        <span class="bet-type-label">${bet.mainBet.type}</span>
                        <span class="value-badge ${this.getValueClass(bet.mainBet.value)}">Value: ${(bet.mainBet.value * 100).toFixed(0)}%</span>
                    </div>
                    <div class="bet-selection-row">
                        <div class="bet-pick">${bet.mainBet.pick}</div>
                        <div class="bet-odds ${this.getValueClass(bet.mainBet.value)}">${this.formatAmericanOdds(bet.mainBet.odds)}</div>
                    </div>
                    <div class="implied-prob">
                        Implied Probability: ${(bet.mainBet.probability * 100).toFixed(0)}%
                    </div>
                </div>
            </div>

            <div class="modal-grid">
                <div class="modal-column">
                    <h3 class="modal-subtitle">Other Opportunities</h3>
                    <div class="other-bets-container">
                        ${otherBetsHtml || '<p class="no-other-bets">No additional bets available</p>'}
                    </div>
                </div>
                
                <div class="modal-column">
                    <h3 class="modal-subtitle">Odds Comparison</h3>
                    <div class="odds-comparison-container">
                        ${sportsBookComparison}
                    </div>
                </div>
            </div>
            
            <div class="modal-section">
                <h3 class="modal-subtitle">Summary</h3>
                <div class="analysis-container">
                    <p>${bet.analysis}</p>
                </div>
            </div>
            
            <div class="modal-section">
                <h3 class="modal-subtitle ai-title">
                    <i class="fas fa-brain text-primary"></i>
                    AI Analysis
                </h3>
                <div class="ai-analysis-container">
                    <p>${bet.aiReasoning}</p>
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
        return odds > 0 ? `+${odds}` : odds;
    }

    getValueClass(value) {
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
        const date = new Date(dateString);
        return date.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true
        });
    }
}

// Email Signup Functionality
document.addEventListener('DOMContentLoaded', function() {
    const emailInput = document.getElementById('emailInput');
    const submitEmailBtn = document.getElementById('submitEmailBtn');
    
    if (submitEmailBtn) {
        submitEmailBtn.addEventListener('click', submitEmail);
    }
    
    if (emailInput) {
        emailInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') submitEmail();
        });
    }
    
    setTimeout(() => {
        const emailModal = document.getElementById('emailSignupModal');
        if (emailModal) emailModal.style.display = 'block';
    }, 1000);
});

function submitEmail() {
    const email = document.getElementById('emailInput').value.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailPattern.test(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    const existing = JSON.parse(localStorage.getItem("betSmartEmails") || "[]");
    if (!existing.includes(email)) {
        existing.push(email);
        localStorage.setItem("betSmartEmails", JSON.stringify(existing));
    }
    
    alert('Thank you! Check your email for access.');
    document.getElementById('emailInput').value = '';
    
    const modal = document.getElementById('emailSignupModal');
    if (modal) modal.style.display = 'none';
}

// ▼ Replace with this updated version ▼
document.addEventListener('DOMContentLoaded', () => {
    // 1. Hide app content until PIN is verified
    document.getElementById('appContent').style.display = 'none';

    // 2. Initialize app (will trigger auth flow)
    const app = new BetSmartApp();

    // 3. Keep existing email signup logic (but add localStorage check)
    const emailInput = document.getElementById('emailInput');
    const submitEmailBtn = document.getElementById('submitEmailBtn');

    if (submitEmailBtn) {
        submitEmailBtn.addEventListener('click', submitEmail);
    }

    if (emailInput) {
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitEmail();
        });
    }

    // 4. Show email modal only once per user
    setTimeout(() => {
        const emailModal = document.getElementById('emailSignupModal');
        if (emailModal && !localStorage.getItem('betSmartEmailShown')) {
            emailModal.style.display = 'block';
            localStorage.setItem('betSmartEmailShown', 'true');
        }
    }, 1000);
});

// 5. Keep the existing submitEmail() function (DO NOT MODIFY)
function submitEmail() {
    const email = document.getElementById('emailInput').value.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailPattern.test(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    const existing = JSON.parse(localStorage.getItem("betSmartEmails") || "[]");
    if (!existing.includes(email)) {
        existing.push(email);
        localStorage.setItem("betSmartEmails", JSON.stringify(existing));
    }
    
    alert('Thank you! Check your email for access.');
    document.getElementById('emailInput').value = '';
    
    const modal = document.getElementById('emailSignupModal');
    if (modal) modal.style.display = 'none';
}
// ▲ End of updated code ▲
