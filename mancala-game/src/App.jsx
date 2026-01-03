import React, { useState, useCallback, useRef, useEffect } from 'react';

const INITIAL_STONES = 4;
const ANIMATION_DELAY = 300; // ms between each stone placement
const AI_THINK_DELAY = 500; // ms before AI makes a move

const createInitialBoard = () => ({
  pits: [
    INITIAL_STONES, INITIAL_STONES, INITIAL_STONES, INITIAL_STONES, INITIAL_STONES, INITIAL_STONES,
    0,
    INITIAL_STONES, INITIAL_STONES, INITIAL_STONES, INITIAL_STONES, INITIAL_STONES, INITIAL_STONES,
    0,
  ],
  currentPlayer: 1,
  gameOver: false,
  winner: null,
  message: "Player 1's turn - Select a pit",
  highlightedPit: null,
  isAnimating: false,
  pickedUpPit: null,
  stonesInHand: 0,
});

const Stone = ({ delay = 0, color, animate = false }) => {
  const colors = [
    'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 
    'bg-rose-400', 'bg-violet-400', 'bg-orange-400',
    'bg-teal-400', 'bg-pink-400', 'bg-lime-400',
  ];
  const stoneColor = colors[Math.abs(color) % colors.length];
  
  return (
    <div 
      className={`w-3 h-3 rounded-full ${stoneColor} shadow-md border border-white/30
                  ${animate ? 'animate-[dropIn_0.25s_ease-out_forwards]' : ''}`}
      style={{ 
        animationDelay: animate ? `${delay * 40}ms` : '0ms',
        opacity: animate ? 0 : 1,
      }}
    />
  );
};

const Pit = ({ stones, onClick, disabled, isStore, isHighlighted, player, pitIndex, isPickedUp, isAnimating }) => {
  const stoneElements = [];
  for (let i = 0; i < stones; i++) {
    stoneElements.push(<Stone key={i} delay={i} color={pitIndex * 3 + i} />);
  }

  if (isStore) {
    return (
      <div 
        className={`
          relative w-24 h-44 rounded-full flex flex-col items-center justify-center
          ${player === 1 ? 'bg-gradient-to-b from-amber-800 to-amber-950' : 'bg-gradient-to-b from-emerald-800 to-emerald-950'}
          border-4 ${player === 1 ? 'border-amber-600' : 'border-emerald-600'}
          shadow-[inset_0_4px_20px_rgba(0,0,0,0.6)]
          transition-all duration-300
          ${isHighlighted ? 'ring-4 ring-yellow-400 scale-105 shadow-[0_0_30px_rgba(250,204,21,0.5)]' : ''}
        `}
      >
        <div 
          className={`absolute -top-8 text-sm font-bold tracking-wider
                      ${player === 1 ? 'text-amber-400' : 'text-emerald-400'}`}
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {player === 1 ? 'P1 STORE' : 'P2 STORE'}
        </div>
        <div className="flex flex-wrap justify-center gap-1 p-3 max-w-20 overflow-hidden">
          {stoneElements}
        </div>
        <div 
          className={`absolute -bottom-8 text-3xl font-black
                      ${player === 1 ? 'text-amber-400' : 'text-emerald-400'}`}
        >
          {stones}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-16 h-16 rounded-full flex flex-wrap items-center justify-center gap-0.5 p-1.5
        bg-gradient-to-br from-stone-600 to-stone-800
        border-3 border-stone-500
        shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]
        transition-all duration-200
        ${!disabled && !isAnimating ? 'hover:scale-110 hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:border-yellow-500 cursor-pointer' : ''}
        ${disabled || isAnimating ? 'cursor-not-allowed' : ''}
        ${isHighlighted ? 'ring-4 ring-yellow-400 scale-110 shadow-[0_0_25px_rgba(250,204,21,0.6)] border-yellow-400' : ''}
        ${isPickedUp ? 'ring-4 ring-cyan-400 scale-95 opacity-70' : ''}
      `}
    >
      <div className="flex flex-wrap justify-center gap-0.5 max-w-12">
        {stoneElements}
      </div>
      <div className="absolute -bottom-6 text-xs font-bold text-stone-400">{stones}</div>
    </button>
  );
};

const HandIndicator = ({ stonesInHand, currentPlayer }) => {
  if (stonesInHand === 0) return null;
  
  const stoneElements = [];
  for (let i = 0; i < Math.min(stonesInHand, 12); i++) {
    stoneElements.push(
      <div 
        key={i} 
        className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-yellow-200 shadow-sm"
      />
    );
  }
  
  return (
    <div className={`
      fixed top-4 left-1/2 -translate-x-1/2 z-50
      px-6 py-3 rounded-full
      bg-gradient-to-r ${currentPlayer === 1 ? 'from-amber-900 to-amber-800' : 'from-emerald-900 to-emerald-800'}
      border-2 ${currentPlayer === 1 ? 'border-amber-500' : 'border-emerald-500'}
      shadow-[0_0_30px_rgba(0,0,0,0.5)]
      flex items-center gap-3
      animate-[slideDown_0.3s_ease-out]
    `}>
      <span className="text-white font-semibold" style={{ fontFamily: 'Crimson Pro, serif' }}>
        Stones in hand:
      </span>
      <div className="flex gap-1 flex-wrap max-w-32">
        {stoneElements}
      </div>
      <span className="text-yellow-300 font-black text-xl">{stonesInHand}</span>
    </div>
  );
};

const MancalaGame = () => {
  const [gameMode, setGameMode] = useState(null);
  const [opponent, setOpponent] = useState(null); // 'human' or 'computer'
  const [board, setBoard] = useState(createInitialBoard());
  const animationRef = useRef(null);
  const aiTimeoutRef = useRef(null);

  const resetGame = useCallback(() => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }
    setBoard(createInitialBoard());
  }, []);

  const checkGameOver = useCallback((pits) => {
    const p1Empty = pits.slice(0, 6).every(p => p === 0);
    const p2Empty = pits.slice(7, 13).every(p => p === 0);
    return p1Empty || p2Empty;
  }, []);

  const finalizeGame = useCallback((pits) => {
    const newPits = [...pits];
    for (let i = 0; i < 6; i++) {
      newPits[6] += newPits[i];
      newPits[i] = 0;
    }
    for (let i = 7; i < 13; i++) {
      newPits[13] += newPits[i];
      newPits[i] = 0;
    }
    
    let winner = null;
    if (newPits[6] > newPits[13]) winner = 1;
    else if (newPits[13] > newPits[6]) winner = 2;
    else winner = 'tie';
    
    return { pits: newPits, winner };
  }, []);

  // Simulate a move and return the resulting state (for AI evaluation)
  const simulateMove = useCallback((pits, pitIndex, player, mode) => {
    const opponentStore = player === 1 ? 13 : 6;
    const playerStore = player === 1 ? 6 : 13;
    let newPits = [...pits];
    
    if (mode === 'davidmontala') {
      let stones = newPits[pitIndex];
      newPits[pitIndex] = 0;
      let currentIndex = pitIndex;
      
      while (stones > 0) {
        currentIndex = (currentIndex + 1) % 14;
        if (currentIndex === opponentStore) continue;
        newPits[currentIndex]++;
        stones--;
      }
      
      const landedInOwnStore = currentIndex === playerStore;
      return { pits: newPits, extraTurn: landedInOwnStore, landedIndex: currentIndex };
    } else {
      // Jonakala
      let currentIndex = pitIndex;
      let continueChain = true;
      
      while (continueChain) {
        let stones = newPits[currentIndex];
        newPits[currentIndex] = 0;
        
        while (stones > 0) {
          currentIndex = (currentIndex + 1) % 14;
          if (currentIndex === opponentStore) continue;
          newPits[currentIndex]++;
          stones--;
        }
        
        if (currentIndex === playerStore) {
          continueChain = false;
        } else if (newPits[currentIndex] === 1) {
          continueChain = false;
        }
      }
      
      return { pits: newPits, extraTurn: false, landedIndex: currentIndex };
    }
  }, []);

  // AI move selection
  const getAIMove = useCallback((pits, mode) => {
    const validMoves = [];
    for (let i = 7; i <= 12; i++) {
      if (pits[i] > 0) {
        validMoves.push(i);
      }
    }
    
    if (validMoves.length === 0) return null;
    
    // Evaluate each move
    let bestMove = validMoves[0];
    let bestScore = -Infinity;
    
    for (const move of validMoves) {
      const result = simulateMove(pits, move, 2, mode);
      let score = 0;
      
      // Score based on stones in our store
      score += (result.pits[13] - pits[13]) * 10;
      
      // In Davidmontala, extra turns are very valuable
      if (mode === 'davidmontala' && result.extraTurn) {
        score += 20;
      }
      
      // Prefer moves that don't leave easy captures for opponent
      // Check if opponent can score on their next turn
      for (let i = 0; i <= 5; i++) {
        if (result.pits[i] > 0) {
          const oppResult = simulateMove(result.pits, i, 1, mode);
          if (mode === 'davidmontala' && oppResult.extraTurn) {
            score -= 5;
          }
        }
      }
      
      // Slight randomness to make it less predictable
      score += Math.random() * 3;
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }, [simulateMove]);

  const animateDavidmontala = useCallback((pitIndex) => {
    const currentPlayer = board.currentPlayer;
    const opponentStore = currentPlayer === 1 ? 13 : 6;
    const playerStore = currentPlayer === 1 ? 6 : 13;
    
    let pits = [...board.pits];
    let stones = pits[pitIndex];
    pits[pitIndex] = 0;
    
    setBoard(prev => ({
      ...prev,
      pits,
      isAnimating: true,
      pickedUpPit: pitIndex,
      stonesInHand: stones,
      message: `Picked up ${stones} stones...`,
    }));

    let currentIndex = pitIndex;
    
    const animateStep = () => {
      if (stones === 0) {
        const landedInOwnStore = currentIndex === playerStore;
        
        if (checkGameOver(pits)) {
          const { pits: finalPits, winner } = finalizeGame(pits);
          setBoard(prev => ({
            ...prev,
            pits: finalPits,
            gameOver: true,
            winner,
            message: winner === 'tie' ? "It's a tie!" : `Player ${winner} wins!`,
            isAnimating: false,
            highlightedPit: null,
            pickedUpPit: null,
            stonesInHand: 0,
          }));
          return;
        }
        
        const nextPlayer = landedInOwnStore ? currentPlayer : (currentPlayer === 1 ? 2 : 1);
        const message = landedInOwnStore 
          ? `Landed in store! Player ${currentPlayer} goes again!`
          : `Player ${nextPlayer}'s turn`;
        
        setBoard(prev => ({
          ...prev,
          pits,
          currentPlayer: nextPlayer,
          message,
          isAnimating: false,
          highlightedPit: null,
          pickedUpPit: null,
          stonesInHand: 0,
        }));
        return;
      }
      
      currentIndex = (currentIndex + 1) % 14;
      if (currentIndex === opponentStore) {
        currentIndex = (currentIndex + 1) % 14;
      }
      
      pits[currentIndex]++;
      stones--;
      
      setBoard(prev => ({
        ...prev,
        pits: [...pits],
        highlightedPit: currentIndex,
        stonesInHand: stones,
        message: stones > 0 ? `Placing stones... ${stones} left` : 'Placed last stone!',
      }));
      
      animationRef.current = setTimeout(animateStep, ANIMATION_DELAY);
    };
    
    animationRef.current = setTimeout(animateStep, ANIMATION_DELAY);
  }, [board, checkGameOver, finalizeGame]);

  const animateJonakala = useCallback((pitIndex) => {
    const currentPlayer = board.currentPlayer;
    const opponentStore = currentPlayer === 1 ? 13 : 6;
    const playerStore = currentPlayer === 1 ? 6 : 13;
    
    let pits = [...board.pits];
    
    const runChain = (startIndex, isFirstPickup = true) => {
      let stones = pits[startIndex];
      pits[startIndex] = 0;
      
      setBoard(prev => ({
        ...prev,
        pits: [...pits],
        isAnimating: true,
        pickedUpPit: startIndex,
        stonesInHand: stones,
        message: isFirstPickup ? `Picked up ${stones} stones...` : `Chaining! Picked up ${stones} more stones...`,
      }));
      
      let currentIndex = startIndex;
      
      const animateStep = () => {
        if (stones === 0) {
          const landedInOwnStore = currentIndex === playerStore;
          const landedPitStones = pits[currentIndex];
          
          // In Jonakala: chain continues if we land in an occupied pit (not store)
          // Chain STOPS if we land in our store OR an empty pit
          if (!landedInOwnStore && currentIndex !== opponentStore && landedPitStones > 1) {
            setBoard(prev => ({
              ...prev,
              message: `Landed on ${landedPitStones} stones - chaining!`,
              highlightedPit: currentIndex,
            }));
            
            animationRef.current = setTimeout(() => {
              runChain(currentIndex, false);
            }, ANIMATION_DELAY * 2);
            return;
          }
          
          if (checkGameOver(pits)) {
            const { pits: finalPits, winner } = finalizeGame(pits);
            setBoard(prev => ({
              ...prev,
              pits: finalPits,
              gameOver: true,
              winner,
              message: winner === 'tie' ? "It's a tie!" : `Player ${winner} wins!`,
              isAnimating: false,
              highlightedPit: null,
              pickedUpPit: null,
              stonesInHand: 0,
            }));
            return;
          }
          
          // In Jonakala, landing in your store ends your turn (switches to other player)
          const nextPlayer = currentPlayer === 1 ? 2 : 1;
          const message = landedInOwnStore 
            ? `Scored! Player ${nextPlayer}'s turn`
            : `Chain ended. Player ${nextPlayer}'s turn`;
          
          setBoard(prev => ({
            ...prev,
            pits,
            currentPlayer: nextPlayer,
            message,
            isAnimating: false,
            highlightedPit: null,
            pickedUpPit: null,
            stonesInHand: 0,
          }));
          return;
        }
        
        currentIndex = (currentIndex + 1) % 14;
        if (currentIndex === opponentStore) {
          currentIndex = (currentIndex + 1) % 14;
        }
        
        pits[currentIndex]++;
        stones--;
        
        setBoard(prev => ({
          ...prev,
          pits: [...pits],
          highlightedPit: currentIndex,
          stonesInHand: stones,
          message: stones > 0 ? `Placing stones... ${stones} left` : 'Placed last stone...',
        }));
        
        animationRef.current = setTimeout(animateStep, ANIMATION_DELAY);
      };
      
      animationRef.current = setTimeout(animateStep, ANIMATION_DELAY);
    };
    
    runChain(pitIndex, true);
  }, [board, checkGameOver, finalizeGame]);

  const handlePitClick = (pitIndex) => {
    if (board.gameOver || board.isAnimating) return;
    if (board.pits[pitIndex] === 0) return;
    
    const isPlayer1Pit = pitIndex >= 0 && pitIndex <= 5;
    const isPlayer2Pit = pitIndex >= 7 && pitIndex <= 12;
    
    if (board.currentPlayer === 1 && !isPlayer1Pit) return;
    if (board.currentPlayer === 2 && !isPlayer2Pit) return;
    
    // In computer mode, player 2 is the AI
    if (opponent === 'computer' && board.currentPlayer === 2) return;
    
    if (gameMode === 'davidmontala') {
      animateDavidmontala(pitIndex);
    } else {
      animateJonakala(pitIndex);
    }
  };

  // AI move trigger
  useEffect(() => {
    if (opponent === 'computer' && 
        board.currentPlayer === 2 && 
        !board.isAnimating && 
        !board.gameOver &&
        gameMode) {
      
      aiTimeoutRef.current = setTimeout(() => {
        const aiMove = getAIMove(board.pits, gameMode);
        if (aiMove !== null) {
          setBoard(prev => ({
            ...prev,
            message: "Computer is thinking...",
          }));
          
          setTimeout(() => {
            if (gameMode === 'davidmontala') {
              animateDavidmontala(aiMove);
            } else {
              animateJonakala(aiMove);
            }
          }, AI_THINK_DELAY);
        }
      }, 300);
      
      return () => {
        if (aiTimeoutRef.current) {
          clearTimeout(aiTimeoutRef.current);
        }
      };
    }
  }, [board.currentPlayer, board.isAnimating, board.gameOver, opponent, gameMode, board.pits, getAIMove, animateDavidmontala, animateJonakala]);

  if (!gameMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex items-center justify-center p-4">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Crimson+Pro:wght@300;400;600&display=swap');
          
          @keyframes shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
        `}</style>
        
        <div className="text-center space-y-12">
          <div className="space-y-4">
            <h1 
              className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500"
              style={{ 
                fontFamily: 'Cinzel, serif',
                textShadow: '0 0 60px rgba(251, 191, 36, 0.3)',
                backgroundSize: '200% auto',
                animation: 'shimmer 3s linear infinite'
              }}
            >
              MANCALA
            </h1>
            <p 
              className="text-stone-400 text-lg tracking-widest"
              style={{ fontFamily: 'Crimson Pro, serif' }}
            >
              ANCIENT GAME OF STRATEGY
            </p>
          </div>
          
          {!opponent ? (
            <>
              <div className="space-y-3">
                <p className="text-stone-500 text-sm tracking-wider" style={{ fontFamily: 'Cinzel, serif' }}>
                  CHOOSE YOUR OPPONENT
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setOpponent('human')}
                    className="group relative px-8 py-4 bg-gradient-to-br from-blue-900/50 to-blue-950/80 
                               border-2 border-blue-700/50 rounded-xl
                               hover:border-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]
                               transition-all duration-300 hover:scale-105"
                  >
                    <div className="text-4xl mb-2">👥</div>
                    <h2 
                      className="text-xl font-bold text-blue-400"
                      style={{ fontFamily: 'Cinzel, serif' }}
                    >
                      2 PLAYERS
                    </h2>
                    <p className="text-stone-400 text-xs" style={{ fontFamily: 'Crimson Pro, serif' }}>
                      Play with a friend
                    </p>
                  </button>
                  
                  <button
                    onClick={() => setOpponent('computer')}
                    className="group relative px-8 py-4 bg-gradient-to-br from-purple-900/50 to-purple-950/80 
                               border-2 border-purple-700/50 rounded-xl
                               hover:border-purple-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]
                               transition-all duration-300 hover:scale-105"
                  >
                    <div className="text-4xl mb-2">🤖</div>
                    <h2 
                      className="text-xl font-bold text-purple-400"
                      style={{ fontFamily: 'Cinzel, serif' }}
                    >
                      VS COMPUTER
                    </h2>
                    <p className="text-stone-400 text-xs" style={{ fontFamily: 'Crimson Pro, serif' }}>
                      Challenge the AI
                    </p>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-stone-500 text-sm tracking-wider" style={{ fontFamily: 'Cinzel, serif' }}>
                  CHOOSE GAME MODE
                </p>
                <div className="flex flex-col gap-4 max-w-md mx-auto">
                  <button
                    onClick={() => setGameMode('davidmontala')}
                    className="group relative px-8 py-6 bg-gradient-to-br from-amber-900/50 to-amber-950/80 
                               border-2 border-amber-700/50 rounded-xl
                               hover:border-amber-500 hover:shadow-[0_0_30px_rgba(251,191,36,0.2)]
                               transition-all duration-300 hover:scale-105"
                    style={{ animation: 'float 3s ease-in-out infinite' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 
                                    opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                    <h2 
                      className="text-2xl font-bold text-amber-400 mb-2"
                      style={{ fontFamily: 'Cinzel, serif' }}
                    >
                      DAVIDMONTALA
                    </h2>
                    <p className="text-stone-400 text-sm" style={{ fontFamily: 'Crimson Pro, serif' }}>
                      Land in your store to go again. Tactical and calculated.
                    </p>
                  </button>
                  
                  <button
                    onClick={() => setGameMode('jonakala')}
                    className="group relative px-8 py-6 bg-gradient-to-br from-emerald-900/50 to-emerald-950/80 
                               border-2 border-emerald-700/50 rounded-xl
                               hover:border-emerald-500 hover:shadow-[0_0_30px_rgba(52,211,153,0.2)]
                               transition-all duration-300 hover:scale-105"
                    style={{ animation: 'float 3s ease-in-out infinite', animationDelay: '0.5s' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 
                                    opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                    <h2 
                      className="text-2xl font-bold text-emerald-400 mb-2"
                      style={{ fontFamily: 'Cinzel, serif' }}
                    >
                      JONAKALA
                    </h2>
                    <p className="text-stone-400 text-sm" style={{ fontFamily: 'Crimson Pro, serif' }}>
                      Chain moves by landing in occupied pits. Flowing and cascading.
                    </p>
                  </button>
                </div>
                
                <button
                  onClick={() => setOpponent(null)}
                  className="mt-4 text-stone-500 hover:text-stone-300 text-sm transition-colors"
                  style={{ fontFamily: 'Crimson Pro, serif' }}
                >
                  ← Back to opponent selection
                </button>
              </div>
            </>
          )}
          
          <div className="mt-12 p-6 bg-stone-900/50 rounded-xl border border-stone-800 max-w-lg mx-auto">
            <h3 className="text-amber-500 font-semibold mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              HOW TO PLAY
            </h3>
            <ul className="text-stone-400 text-sm space-y-2 text-left" style={{ fontFamily: 'Crimson Pro, serif' }}>
              <li>• Click a pit on your side to sow its stones counter-clockwise</li>
              <li>• Collect stones in your store (the large pit on your right)</li>
              <li>• When one side empties, the other player collects remaining stones</li>
              <li>• Most stones in your store wins!</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const isPlayer1Turn = board.currentPlayer === 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex flex-col items-center justify-center p-4 gap-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Crimson+Pro:wght@300;400;600&display=swap');
        
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.8); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      
      {/* Hand Indicator */}
      <HandIndicator stonesInHand={board.stonesInHand} currentPlayer={board.currentPlayer} />
      
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 
          className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r 
                      ${gameMode === 'davidmontala' ? 'from-amber-400 to-yellow-300' : 'from-emerald-400 to-teal-300'}`}
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {gameMode === 'davidmontala' ? 'DAVIDMONTALA' : 'JONAKALA'}
        </h1>
        <p className="text-stone-500 text-xs tracking-widest" style={{ fontFamily: 'Crimson Pro, serif' }}>
          {gameMode === 'davidmontala' 
            ? 'Land in your store to go again' 
            : 'Chain through occupied pits'}
        </p>
      </div>

      {/* Game Status */}
      <div 
        className={`px-6 py-3 rounded-full border-2 transition-all duration-300
                    ${isPlayer1Turn ? 'bg-amber-900/30 border-amber-600' : 'bg-emerald-900/30 border-emerald-600'}
                    ${board.isAnimating ? 'animate-pulse' : ''}`}
      >
        <p 
          className={`text-lg font-semibold ${isPlayer1Turn ? 'text-amber-400' : 'text-emerald-400'}`}
          style={{ fontFamily: 'Crimson Pro, serif' }}
        >
          {board.message}
        </p>
      </div>

      {/* Game Board */}
      <div 
        className="relative bg-gradient-to-br from-stone-800 via-stone-850 to-stone-900 
                   rounded-3xl p-8 shadow-2xl border-4 border-stone-700"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 2px 20px rgba(255,255,255,0.05)'
        }}
      >
        {/* Wood grain texture overlay */}
        <div 
          className="absolute inset-0 rounded-3xl opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
          }}
        />
        
        <div className="flex items-center gap-6">
          {/* Player 2's Store (left side) */}
          <Pit 
            stones={board.pits[13]} 
            isStore 
            player={2}
            pitIndex={13}
            isHighlighted={board.highlightedPit === 13}
          />
          
          {/* Main playing area */}
          <div className="flex flex-col gap-8">
            {/* Player 2's pits (top row, right to left) */}
            <div className="flex gap-4">
              {[12, 11, 10, 9, 8, 7].map((i) => (
                <Pit
                  key={i}
                  stones={board.pits[i]}
                  onClick={() => handlePitClick(i)}
                  disabled={board.gameOver || board.isAnimating || board.currentPlayer !== 2 || board.pits[i] === 0}
                  pitIndex={i}
                  isHighlighted={board.highlightedPit === i}
                  isPickedUp={board.pickedUpPit === i}
                  isAnimating={board.isAnimating}
                />
              ))}
            </div>
            
            {/* Player indicators */}
            <div className="flex justify-between px-2">
              <span 
                className={`text-xs font-bold tracking-wider transition-opacity duration-300
                           ${board.currentPlayer === 2 && !board.gameOver ? 'text-emerald-400' : 'text-emerald-700'}`}
              >
                ← {opponent === 'computer' ? 'COMPUTER' : 'PLAYER 2'} {board.currentPlayer === 2 && !board.isAnimating && !board.gameOver && (opponent === 'computer' ? '(THINKING...)' : '(YOUR TURN)')}
              </span>
              <span 
                className={`text-xs font-bold tracking-wider transition-opacity duration-300
                           ${board.currentPlayer === 1 && !board.gameOver ? 'text-amber-400' : 'text-amber-700'}`}
              >
                {board.currentPlayer === 1 && !board.isAnimating && !board.gameOver && '(YOUR TURN) '}PLAYER 1 →
              </span>
            </div>
            
            {/* Player 1's pits (bottom row, left to right) */}
            <div className="flex gap-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Pit
                  key={i}
                  stones={board.pits[i]}
                  onClick={() => handlePitClick(i)}
                  disabled={board.gameOver || board.isAnimating || board.currentPlayer !== 1 || board.pits[i] === 0}
                  pitIndex={i}
                  isHighlighted={board.highlightedPit === i}
                  isPickedUp={board.pickedUpPit === i}
                  isAnimating={board.isAnimating}
                />
              ))}
            </div>
          </div>
          
          {/* Player 1's Store (right side) */}
          <Pit 
            stones={board.pits[6]} 
            isStore 
            player={1}
            pitIndex={6}
            isHighlighted={board.highlightedPit === 6}
          />
        </div>
      </div>

      {/* Score Display */}
      <div className="flex gap-8 text-center">
        <div className={`px-6 py-3 rounded-xl transition-all duration-300 ${isPlayer1Turn && !board.gameOver ? 'bg-amber-900/50 ring-2 ring-amber-500' : 'bg-stone-800/50'}`}>
          <p className="text-amber-400 text-sm font-semibold" style={{ fontFamily: 'Cinzel, serif' }}>PLAYER 1</p>
          <p className="text-3xl font-black text-amber-300">{board.pits[6]}</p>
        </div>
        <div className={`px-6 py-3 rounded-xl transition-all duration-300 ${!isPlayer1Turn && !board.gameOver ? 'bg-emerald-900/50 ring-2 ring-emerald-500' : 'bg-stone-800/50'}`}>
          <p className="text-emerald-400 text-sm font-semibold" style={{ fontFamily: 'Cinzel, serif' }}>{opponent === 'computer' ? 'COMPUTER' : 'PLAYER 2'}</p>
          <p className="text-3xl font-black text-emerald-300">{board.pits[13]}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <button
          onClick={resetGame}
          disabled={board.isAnimating}
          className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg 
                     border border-stone-600 transition-all duration-200 hover:scale-105
                     disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: 'Crimson Pro, serif' }}
        >
          New Game
        </button>
        <button
          onClick={() => { setGameMode(null); setOpponent(null); resetGame(); }}
          disabled={board.isAnimating}
          className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg 
                     border border-stone-600 transition-all duration-200 hover:scale-105
                     disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: 'Crimson Pro, serif' }}
        >
          Change Mode
        </button>
      </div>

      {/* Rules reminder */}
      <div className="max-w-lg text-center text-stone-500 text-xs" style={{ fontFamily: 'Crimson Pro, serif' }}>
        {gameMode === 'davidmontala' ? (
          <p>Sow stones one at a time. Land in your store (right) to go again. Skip opponent's store.</p>
        ) : (
          <p>Sow stones, then if you land in an occupied pit, pick up those stones and keep going until you land in an empty pit or your store.</p>
        )}
      </div>

      {/* Game Over Modal */}
      {board.gameOver && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div 
            className="bg-gradient-to-br from-stone-800 to-stone-900 p-8 rounded-2xl border-2 border-amber-600 
                       shadow-[0_0_60px_rgba(251,191,36,0.3)] text-center space-y-6"
            style={{ animation: 'dropIn 0.3s ease-out' }}
          >
            <h2 
              className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {board.winner === 1 && opponent === 'computer' ? 'YOU WIN!' : 
               board.winner === 2 && opponent === 'computer' ? 'COMPUTER WINS!' : 
               'GAME OVER'}
            </h2>
            <p className="text-2xl text-stone-300" style={{ fontFamily: 'Crimson Pro, serif' }}>
              {board.winner === 'tie' 
                ? "It's a tie!" 
                : opponent === 'computer' 
                  ? (board.winner === 1 ? 'Congratulations!' : 'Better luck next time!')
                  : `Player ${board.winner} wins!`}
            </p>
            <p className="text-stone-400">
              Final Score: <span className="text-amber-400 font-bold">{board.pits[6]}</span> - <span className="text-emerald-400 font-bold">{board.pits[13]}</span>
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={resetGame}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold rounded-lg 
                           transition-all duration-200 hover:scale-105"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                Play Again
              </button>
              <button
                onClick={() => { setGameMode(null); setOpponent(null); resetGame(); }}
                className="px-6 py-3 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg 
                           border border-stone-500 transition-all duration-200 hover:scale-105"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                Change Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MancalaGame;
