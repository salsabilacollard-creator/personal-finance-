document.addEventListener('DOMContentLoaded', function() {

  const CATEGORIES = {
    expense: ['Food','Transport','Housing','Utilities','Entertainment','Health','Shopping','Other'],
    income: ['Salary','Freelance','Investment','Gift','Other']
  };

  let state = {
    transactions: JSON.parse(localStorage.getItem('pfd_transactions') || '[]'),
    budgets: JSON.parse(localStorage.getItem('pfd_budgets') || '{}'),
    goals: JSON.parse(localStorage.getItem('pfd_goals') || '[]')
  };
  let currentType = 'expense';
  let pieChart, barChart;

  function save(){
    localStorage.setItem('pfd_transactions', JSON.stringify(state.transactions));
    localStorage.setItem('pfd_budgets', JSON.stringify(state.budgets));
    localStorage.setItem('pfd_goals', JSON.stringify(state.goals));
  }
  function fmt(n){ return Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' MAD'; }
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  function populateCategorySelects(){
    const txCat = document.getElementById('txCategory');
    txCat.innerHTML = CATEGORIES[currentType].map(c=>`<option value="${c}">${c}</option>`).join('');
    const bCat = document.getElementById('budgetCategory');
    bCat.innerHTML = CATEGORIES.expense.map(c=>`<option value="${c}">${c}</option>`).join('');
  }

  document.getElementById('typeToggle').addEventListener('click', e=>{
    const btn = e.target.closest('button'); if(!btn) return;
    currentType = btn.dataset.type;
    document.querySelectorAll('#typeToggle button').forEach(b=>b.classList.toggle('active', b===btn));
    populateCategorySelects();
  });

  document.getElementById('txForm').addEventListener('submit', e=>{
    e.preventDefault();
    const amount = parseFloat(document.getElementById('txAmount').value);
    const category = document.getElementById('txCategory').value;
    const description = document.getElementById('txDesc').value.trim();
    const date = document.getElementById('txDate').value;
    if(!amount || amount<=0) return;
    state.transactions.push({id:uid(), type:currentType, amount, category, description, date});
    save();
    e.target.reset();
    document.getElementById('txDate').value = todayStr();
    renderAll();
  });

  function todayStr(){ return new Date().toISOString().slice(0,10); }
  document.getElementById('txDate').value = todayStr();

  window.deleteTx = function(id){
    state.transactions = state.transactions.filter(t=>t.id!==id);
    save(); renderAll();
  }

  document.getElementById('budgetForm').addEventListener('submit', e=>{
    e.preventDefault();
    const cat = document.getElementById('budgetCategory').value;
    const amt = parseFloat(document.getElementById('budgetAmount').value);
    if(!amt || amt<=0) return;
    state.budgets[cat] = amt;
    save();
    e.target.reset();
    renderBudgets();
  });

  function renderBudgets(){
    const el = document.getElementById('budgetList');
    const cats = Object.keys(state.budgets);
    if(cats.length===0){ el.innerHTML = '<div class="empty">No budgets set.</div>'; return; }
    const now = new Date();
    const monthTx = state.transactions.filter(t=>{
      const d = new Date(t.date);
      return t.type==='expense' && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    });
    el.innerHTML = cats.map(cat=>{
      const spent = monthTx.filter(t=>t.category===cat).reduce((s,t)=>s+t.amount,0);
      const limit = state.budgets[cat];
      const pct = Math.min((spent/limit)*100, 100);
      const over = spent > limit;
      return `<div class="budget-item">
        <div class="budget-head">
          <span>${cat}</span>
          <span>${over?'<span class="over-label">Over</span> ':''}${fmt(spent)} / ${fmt(limit)}</span>
        </div>
        <div class="bar-bg"><div class="bar-fill ${over?'over':''}" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
  }

  document.getElementById('goalForm').addEventListener('submit', e=>{
    e.preventDefault();
    const name = document.getElementById('goalName').value.trim();
    const target = parseFloat(document.getElementById('goalTarget').value);
    if(!name || !target || target<=0) return;
    state.goals.push({id:uid(), name, target, saved:0});
    save();
    e.target.reset();
    renderGoals();
  });

  window.addToGoal = function(id){
    const amt = parseFloat(prompt('Amount to add (MAD):'));
    if(!amt || amt<=0) return;
    const g = state.goals.find(g=>g.id===id);
    g.saved += amt;
    save(); renderGoals();
  }
  window.deleteGoal = function(id){
    state.goals = state.goals.filter(g=>g.id!==id);
    save(); renderGoals();
  }

  function renderGoals(){
    const el = document.getElementById('goalList');
    if(state.goals.length===0){ el.innerHTML = '<div class="empty">No savings goals yet.</div>'; return; }
    el.innerHTML = state.goals.map(g=>{
      const pct = Math.min((g.saved/g.target)*100, 100);
      return `<div class="goal-item">
        <div class="goal-head"><span>${g.name}</span><span>${fmt(g.saved)} / ${fmt(g.target)}</span></div>
        <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="goal-actions">
          <button class="del-btn" onclick="addToGoal('${g.id}')">+ Add funds</button>
          <button class="del-btn" onclick="deleteGoal('${g.id}')">Delete</button>
        </div>
      </div>`;
    }).join('');
  }

  function renderSummary(){
    const income = state.transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const expense = state.transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    const now = new Date();
    const monthExpense = state.transactions.filter(t=>{
      const d = new Date(t.date);
      return t.type==='expense' && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    }).reduce((s,t)=>s+t.amount,0);
    document.getElementById('balanceVal').textContent = fmt(income-expense);
    document.getElementById('incomeVal').textContent = fmt(income);
    document.getElementById('expenseVal').textContent = fmt(expense);
    document.getElementById('monthVal').textContent = fmt(monthExpense);
  }

  window.deleteTx = window.deleteTx || function(id){
    state.transactions = state.transactions.filter(t=>t.id!==id);
    save(); renderAll();
  };

  function renderTable(){
    const body = document.getElementById('txTableBody');
    const sorted = [...state.transactions].sort((a,b)=> new Date(b.date)-new Date(a.date));
    document.getElementById('emptyMsg').style.display = sorted.length===0 ? 'block' : 'none';
    body.innerHTML = sorted.map(t=>`
      <tr>
        <td>${t.date}</td>