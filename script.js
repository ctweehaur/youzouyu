// ==========================================
// 1. 初始化变量与状态管理
// ==========================================
let currentPlan = [];       // 当前学习的生词队列
let currentIndex = 0;       // 当前学习的生词索引
let isFlipped = false;      // 卡片是否翻转
let isWeaknessMode = false; // 是否处于错题专项训练模式

// --- Quiz 测验专用变量 ---
let quizQuestions = [];     // 测验题目队列
let quizCurrentIndex = 0;   // 当前题号
let quizScore = 0;          // 答对题数
let quizHistory = [];       // 已考过的词汇记录（用于避免重复）
let quizRound = 0;          // 当前轮次

if (typeof allIdioms === 'undefined') {
    console.error("错误：未找到生词数据，请检查 data.js 是否正确引入！");
}

// ==========================================
// 2. 核心初始化函数 (学习卡片)
// ==========================================
function initApp() {
    try {
        let wrongList = JSON.parse(localStorage.getItem('vocabulary_wrong_list')) || [];
        updateWeaknessButton(wrongList.length);

        // 直接使用全部数据，打乱顺序
        currentPlan = [...allIdioms].sort(() => 0.5 - Math.random());
        currentIndex = 0;
        isWeaknessMode = false;
        
        // 重置测验历史
        quizHistory = [];
        quizRound = 0;
        
        setupFlipEvent();
        renderCard();
        updateMasteryProgress();
        updateNavButtons();
    } catch (error) {
        console.error("初始化失败:", error);
    }
}

function renderCard() {
    if (currentPlan.length === 0) {
        showEmptyState();
        return;
    }
    if (currentIndex >= currentPlan.length) { currentIndex = 0; }
    if (currentIndex < 0) { currentIndex = 0; }

    const currentWord = currentPlan[currentIndex];
    const flipCardEl = document.getElementById('flip-card');
    if (flipCardEl) flipCardEl.classList.remove('rotate-y-180');
    isFlipped = false;

    // 正面渲染
    const rubyContainer = document.getElementById('card-word-ruby');
    if (rubyContainer) {
        const wordText = currentWord.word || "未知生词";
        const pinyinText = currentWord.pinyin || "";

        if (pinyinText) {
            const pinyinArray = pinyinText.split(/\s+/);
            let rubyHtml = "";
            for (let i = 0; i < wordText.length; i++) {
                const char = wordText[i];
                const py = pinyinArray[i] || "";
                rubyHtml += `
                    <ruby class="flex flex-col items-center mx-1">
                        <rt class="text-lg sm:text-xl text-stone-500 font-sans tracking-normal lowercase mb-2 font-medium">${py}</rt>
                        <span class="font-serif font-bold">${char}</span>
                    </ruby>
                `;
            }
            rubyContainer.innerHTML = rubyHtml;
        } else {
            rubyContainer.innerHTML = `<span class="font-serif font-bold">${wordText}</span>`;
        }
    }

    // 反面渲染
    const defZhEl = document.getElementById('card-def-zh');
    if (defZhEl) defZhEl.innerText = currentWord.defZh || '暂无释义';

    const defEnEl = document.getElementById('card-def-en');
    if (defEnEl) defEnEl.innerText = currentWord.defEn || 'No English translation available.';

    const defBmEl = document.getElementById('card-def-bm');
    if (defBmEl) defBmEl.innerText = currentWord.defBm || 'Tiada terjemahan.';

    const exampleEl = document.getElementById('card-example');
    if (exampleEl) {
        const wordText = currentWord.word || '';
        let exampleText = currentWord.example || '暂无例句。';
        if (wordText && exampleText.includes(wordText)) {
            exampleText = exampleText.replace(wordText, `______`);
        }
        exampleEl.innerText = exampleText;
    }

    const progressEl = document.getElementById('progress-indicator');
    if (progressEl) {
        progressEl.innerText = `进度：${currentIndex + 1} / ${currentPlan.length} ${isWeaknessMode ? '（错题训练中）' : ''}`;
    }

    // 更新导航按钮状态
    updateNavButtons();
}

function setupFlipEvent() {
    const container = document.getElementById('card-container');
    const flipCardEl = document.getElementById('flip-card');
    if (container && flipCardEl) {
        container.onclick = null;
        container.onclick = function() {
            isFlipped = !isFlipped;
            flipCardEl.classList.toggle('rotate-y-180', isFlipped);
        };
    }
}

// ==========================================
// 3. 导航功能：上一个 / 下一个
// ==========================================
function prevCard() {
    if (currentPlan.length === 0) return;
    
    // 如果当前是第一张，跳转到最后一张
    if (currentIndex === 0) {
        currentIndex = currentPlan.length - 1;
    } else {
        currentIndex--;
    }
    
    // 如果卡片是翻转状态，回到正面
    const flipCardEl = document.getElementById('flip-card');
    if (flipCardEl && isFlipped) {
        flipCardEl.classList.remove('rotate-y-180');
        isFlipped = false;
    }
    
    renderCard();
}

function nextCard() {
    if (currentPlan.length === 0) return;
    
    // 如果当前是最后一张，跳转到第一张
    if (currentIndex === currentPlan.length - 1) {
        currentIndex = 0;
    } else {
        currentIndex++;
    }
    
    // 如果卡片是翻转状态，回到正面
    const flipCardEl = document.getElementById('flip-card');
    if (flipCardEl && isFlipped) {
        flipCardEl.classList.remove('rotate-y-180');
        isFlipped = false;
    }
    
    renderCard();
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const counter = document.getElementById('card-counter');
    
    // 按钮禁用状态（只有0个词时禁用）
    if (prevBtn) {
        prevBtn.disabled = currentPlan.length === 0;
        prevBtn.style.opacity = currentPlan.length === 0 ? '0.3' : '1';
    }
    if (nextBtn) {
        nextBtn.disabled = currentPlan.length === 0;
        nextBtn.style.opacity = currentPlan.length === 0 ? '0.3' : '1';
    }
    if (counter) {
        if (currentPlan.length > 0) {
            counter.innerText = `${currentIndex + 1} / ${currentPlan.length}`;
        } else {
            counter.innerText = '0 / 0';
        }
    }
}

// ==========================================
// 4. 标记掌握状态
// ==========================================
function markMastery(isMastered) {
    if (currentPlan.length === 0) return;
    
    const currentWord = currentPlan[currentIndex];
    let wrongList = JSON.parse(localStorage.getItem('vocabulary_wrong_list')) || [];
    const currentWordText = currentWord.word || '';

    if (!isMastered) {
        if (!wrongList.some(item => item.word === currentWordText)) { 
            wrongList.push(currentWord); 
        }
        showToast("📌 已加入待加强训练库");
    } else {
        wrongList = wrongList.filter(item => item.word !== currentWordText);
        showToast("🎉 太棒了，这个词已经熟练掌握！");
    }

    localStorage.setItem('vocabulary_wrong_list', JSON.stringify(wrongList));
    updateWeaknessButton(wrongList.length);
    updateMasteryProgress();
    
    // 自动进入下一个
    nextCard();
}

function startWeaknessTraining() {
    const wrongList = JSON.parse(localStorage.getItem('vocabulary_wrong_list')) || [];
    if (wrongList.length === 0) {
        showToast("✨ 赞！当前没有待加强的生词！");
        return;
    }
    isWeaknessMode = true;
    currentPlan = [...wrongList].sort(() => 0.5 - Math.random()); 
    currentIndex = 0;
    renderCard();
}

function updateWeaknessButton(count) {
    const btn = document.querySelector('button[onclick="startWeaknessTraining()"]');
    if (btn) btn.innerHTML = `🎯 开启错题专项训练 (<span class="text-amber-600 font-bold">${count}</span>)`;
    
    // 同时更新单独显示的计数
    const countEl = document.getElementById('wrong-count');
    if (countEl) countEl.innerText = count;
}

function showEmptyState() {
    const rubyContainer = document.getElementById('card-word-ruby');
    if (rubyContainer) rubyContainer.innerHTML = `<span class="text-base text-stone-400">暂无生词数据</span>`;
}

// ==========================================
// 5. Toast 通知系统
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const bgClass = type === 'success' 
        ? 'bg-stone-800 text-white' 
        : 'bg-red-50 border border-red-200 text-red-800';
    toast.className = `${bgClass} px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold tracking-wide flex items-center gap-1.5 animate-bounce pointer-events-auto transition-all duration-300`;
    toast.innerHTML = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('opacity-0', '-translate-y-2');
        setTimeout(() => { toast.remove(); }, 300);
    }, 2500);
}

// ==========================================
// 6. 进度追踪
// ==========================================
function updateMasteryProgress() {
    if (typeof allIdioms === 'undefined' || allIdioms.length === 0) {
        return;
    }
    
    let wrongList = JSON.parse(localStorage.getItem('vocabulary_wrong_list')) || [];
    const totalWords = allIdioms.length;
    const wrongCount = wrongList.length;
    const masteredCount = Math.max(0, totalWords - wrongCount);
    
    const percent = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;
    
    const bar = document.getElementById('mastery-progress-bar');
    if (bar) bar.style.width = `${percent}%`;
    
    const txt = document.getElementById('mastery-status');
    if (txt) txt.innerText = `已掌握 ${masteredCount} / ${totalWords} 词 (${percent}%)`;
}


// ==========================================
// 7. 核心 Quiz (小测验) 控制逻辑
// ==========================================

// 开启测验
function startQuiz() {
    if (!allIdioms || allIdioms.length < 4) {
        showToast("⚠️ 生词数量不足 4 个，无法生成选择题！", "error");
        return;
    }

    const availableWords = allIdioms.filter(item => !quizHistory.includes(item.word));
    
    if (availableWords.length === 0) {
        quizHistory = [];
        quizRound++;
        showToast(`🔄 第 ${quizRound} 轮完成！开始新一轮测试`, "success");
        const newAvailable = allIdioms.filter(item => !quizHistory.includes(item.word));
        if (newAvailable.length === 0) {
            showToast("⚠️ 没有可用的生词了！", "error");
            return;
        }
        const shuffled = [...newAvailable].sort(() => 0.5 - Math.random());
        const actualTotal = Math.min(5, shuffled.length);
        quizQuestions = shuffled.slice(0, actualTotal);
    } else {
        const shuffled = [...availableWords].sort(() => 0.5 - Math.random());
        const actualTotal = Math.min(5, shuffled.length);
        quizQuestions = shuffled.slice(0, actualTotal);
    }

    quizQuestions.forEach(q => {
        if (!quizHistory.includes(q.word)) {
            quizHistory.push(q.word);
        }
    });

    quizQuestions = quizQuestions.map(q => {
        return {
            ...q,
            qType: Math.floor(Math.random() * 3)
        };
    });

    quizCurrentIndex = 0;
    quizScore = 0;

    document.getElementById('quiz-question-container').classList.remove('hidden');
    document.getElementById('quiz-result-container').classList.add('hidden');

    document.getElementById('quiz-title-text').innerText = `🎯 生词测验 - 第 ${quizRound + 1} 轮`;
    document.getElementById('quiz-modal').classList.remove('hidden');
    renderQuizQuestion();
}

// 关闭测验
function closeQuiz() {
    document.getElementById('quiz-modal').classList.add('hidden');
}

// 渲染单道选择题
function renderQuizQuestion() {
    const currentQ = quizQuestions[quizCurrentIndex];
    
    document.getElementById('quiz-q-num').innerText = `题目 ${quizCurrentIndex + 1} / ${quizQuestions.length}`;
    const percent = ((quizCurrentIndex) / quizQuestions.length) * 100;
    document.getElementById('quiz-progress-bar').style.width = `${percent}%`;

    const questionWordEl = document.getElementById('quiz-question-word');

    const distractors = allIdioms
        .filter(item => item.word !== currentQ.word)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

    const options = [currentQ, ...distractors].sort(() => 0.5 - Math.random());
    const optionsContainer = document.getElementById('quiz-options');

    if (currentQ.qType === 0) {
        // 看词猜意
        questionWordEl.innerHTML = `<span class="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded mr-2 font-sans font-medium">看词猜意</span><br>${currentQ.word}`;
        
        optionsContainer.innerHTML = options.map(opt => {
            const isCorrect = (opt.word === currentQ.word);
            return `
                <button onclick="handleQuizAnswer(this, ${isCorrect})" class="w-full text-left p-4 rounded-xl border-2 border-stone-100 hover:border-amber-400 hover:bg-amber-50/50 transition-all font-sans text-stone-700 text-sm leading-relaxed">
                    ${opt.defZh}
                </button>
            `;
        }).join('');

    } else if (currentQ.qType === 1) {
        // 根据释义选词
        questionWordEl.innerHTML = `<span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-sans font-medium block w-max mx-auto mb-2">根据释义选生词</span><p class="text-base font-medium font-sans px-4 text-stone-700 leading-relaxed text-left">${currentQ.defZh}</p>`;
        
        optionsContainer.innerHTML = options.map(opt => {
            const isCorrect = (opt.word === currentQ.word);
            return `
                <button onclick="handleQuizAnswer(this, ${isCorrect})" class="w-full text-center p-4 rounded-xl border-2 border-stone-100 hover:border-amber-400 hover:bg-amber-50/50 transition-all font-serif font-bold text-stone-800 text-base">
                    ${opt.word}
                </button>
            `;
        }).join('');

    } else if (currentQ.qType === 2) {
        // 语境填空
        let exampleText = currentQ.example || '暂无例句。';
        if (currentQ.word && exampleText.includes(currentQ.word)) {
            exampleText = exampleText.replace(currentQ.word, ` ______ `);
        }
        
        questionWordEl.innerHTML = `<span class="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-sans font-medium block w-max mx-auto mb-2">生词语境填空</span><p class="text-base font-normal font-sans px-4 text-stone-700 leading-relaxed text-left">${exampleText}</p>`;
        
        optionsContainer.innerHTML = options.map(opt => {
            const isCorrect = (opt.word === currentQ.word);
            return `
                <button onclick="handleQuizAnswer(this, ${isCorrect})" class="w-full text-center p-4 rounded-xl border-2 border-stone-100 hover:border-amber-400 hover:bg-amber-50/50 transition-all font-serif font-bold text-stone-800 text-base">
                    ${opt.word}
                </button>
            `;
        }).join('');
    }
}

// 处理用户点击选项响应
function handleQuizAnswer(buttonEl, isCorrect) {
    const allButtons = document.getElementById('quiz-options').querySelectorAll('button');
    allButtons.forEach(btn => btn.disabled = true);

    if (isCorrect) {
        quizScore++;
        buttonEl.classList.remove('border-stone-100', 'hover:border-amber-400');
        buttonEl.classList.add('border-green-500', 'bg-green-50/60', 'text-green-800');
    } else {
        buttonEl.classList.remove('border-stone-100', 'hover:border-amber-400');
        buttonEl.classList.add('border-red-500', 'bg-red-50/60', 'text-red-800');
        
        allButtons.forEach(btn => {
            if (btn.getAttribute('onclick').includes('true')) {
                btn.classList.add('border-green-500', 'bg-green-50/40');
            }
        });

        let wrongList = JSON.parse(localStorage.getItem('vocabulary_wrong_list')) || [];
        const currentQ = quizQuestions[quizCurrentIndex];
        if (!wrongList.some(item => item.word === currentQ.word)) {
            wrongList.push(currentQ);
            localStorage.setItem('vocabulary_wrong_list', JSON.stringify(wrongList));
            updateWeaknessButton(wrongList.length);
            updateMasteryProgress();
        }
    }

    setTimeout(() => {
        quizCurrentIndex++;
        if (quizCurrentIndex < quizQuestions.length) {
            renderQuizQuestion();
        } else {
            showQuizResults();
        }
    }, 1200);
}

// 结算小测验结果
function showQuizResults() {
    document.getElementById('quiz-progress-bar').style.width = `100%`;
    document.getElementById('quiz-question-container').classList.add('hidden');
    document.getElementById('quiz-result-container').classList.remove('hidden');

    document.getElementById('quiz-score').innerText = `${quizScore} / ${quizQuestions.length}`;
    
    let evaluation = "再接再厉，多刷刷闪卡吧！";
    if (quizScore === quizQuestions.length) {
        evaluation = "👑 太厉害了！满分通关！";
    } else if (quizScore >= 4) {
        evaluation = "🌟 优秀！底子非常扎实！";
    } else if (quizScore >= 3) {
        evaluation = "👍 及格啦，答错的词已经自动帮你放入错题库啰！";
    }
    
    const remaining = allIdioms.filter(item => !quizHistory.includes(item.word)).length;
    evaluation += `<br><span class="text-[10px] text-stone-400">剩余 ${remaining} 个生词待测试</span>`;
    
    document.getElementById('quiz-eval').innerHTML = evaluation;
}

// 启动执行
window.onload = function() {
    initApp();
};
