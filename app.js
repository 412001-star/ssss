// 簡單純前端單字卡應用
const STORAGE_KEY = 'vocab_words_v1'

// 紀錄 UI 元件
const cardEl = document.getElementById('card')
const wordLarge = document.getElementById('word-large')
const chineseEl = document.getElementById('chinese')
const posEl = document.getElementById('pos')
const exampleEl = document.getElementById('example')
const rootEl = document.getElementById('root')

const prevBtn = document.getElementById('prev')
const nextBtn = document.getElementById('next')
const btnMain = document.getElementById('btn-main')
const btnManage = document.getElementById('btn-manage')

const mainView = document.getElementById('main-view')
const manageView = document.getElementById('manage-view')

// 後端 Google Apps Script Web App URL
const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxKTn5vSd7KC2-gihys5J4A30ithECZEUQ7sduVGk2ApIkpeq154mcJ5GOypTsatZMnOQ/exec
// 管理表單
const form = document.getElementById('word-form')
const fWord = document.getElementById('f-word')
const fChinese = document.getElementById('f-chinese')
const fPos = document.getElementById('f-pos')
const fExample = document.getElementById('f-example')
const fRoot = document.getElementById('f-root')
const autoFillBtn = document.getElementById('auto-fill')
const wordListEl = document.getElementById('word-list')

let words = []
let currentIndex = 0

function saveWords(){localStorage.setItem(STORAGE_KEY,JSON.stringify(words))}
function loadWords(){
  const raw = localStorage.getItem(STORAGE_KEY)
  if(raw){
    try{words = JSON.parse(raw)}catch(e){words=[]}
  }
  if(!words || words.length===0){
    words = [
      {word:'hello',chinese:'哈囉',pos:'interjection',example:'Hello, how are you?',root:'from Old English hāl'},
      {word:'book',chinese:'書',pos:'noun',example:'I read a book.',root:'Proto-Germanic *bokiz'}
    ]
    saveWords()
  }
}

function renderCard(){
  if(!words.length) return
  const w = words[currentIndex]
  wordLarge.textContent = w.word
  chineseEl.textContent = w.chinese || '—'
  posEl.textContent = w.pos || '—'
  exampleEl.textContent = w.example || '—'
  rootEl.textContent = w.root || '—'
}

function renderList(){
  wordListEl.innerHTML = ''
  words.forEach((w,i)=>{
    const li = document.createElement('li')
    li.innerHTML = `<div><strong>${w.word}</strong> — ${w.chinese||''}</div>`
    const del = document.createElement('button')
    del.textContent = '刪除'
    del.addEventListener('click',()=>{
      if(confirm('確定要刪除 '+w.word+' 嗎？')){
        words.splice(i,1);saveWords();renderList();currentIndex=Math.max(0,Math.min(currentIndex,words.length-1));renderCard()
      }
    })
    li.appendChild(del)
    wordListEl.appendChild(li)
  })
}

cardEl.addEventListener('click',()=>cardEl.classList.toggle('flipped'))
prevBtn.addEventListener('click',()=>{currentIndex=(currentIndex-1+words.length)%words.length;renderCard();cardEl.classList.remove('flipped')})
nextBtn.addEventListener('click',()=>{currentIndex=(currentIndex+1)%words.length;renderCard();cardEl.classList.remove('flipped')})

btnManage.addEventListener('click',()=>{mainView.classList.add('hidden');manageView.classList.remove('hidden');renderList()})
btnMain.addEventListener('click',()=>{manageView.classList.add('hidden');mainView.classList.remove('hidden')})

async function sendWordToBackend(wordItem){
  if(!GAS_ENDPOINT || GAS_ENDPOINT.includes('REPLACE_WITH_DEPLOYMENT_ID')){
    throw new Error('請先設定 GAS_ENDPOINT 為您的 Google Apps Script Web App URL')
  }

  const res = await fetch(GAS_ENDPOINT, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(wordItem)
  })

  if(!res.ok){
    const text = await res.text()
    throw new Error(`後端回傳錯誤：${res.status} ${res.statusText} ${text}`)
  }

  return await res.json().catch(()=>null)
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault()
  const item = {
    word: fWord.value.trim(),
    chinese: fChinese.value.trim(),
    pos: fPos.value.trim(),
    example: fExample.value.trim(),
    root: fRoot.value.trim()
  }
  if(!item.word) return alert('請輸入英文單字')

  try{
    await sendWordToBackend(item)
    words.push(item)
    saveWords();renderList();form.reset();
    alert('已儲存並送出後端')
  }catch(err){
    console.error('後端提交失敗', err)
    words.push(item)
    saveWords();renderList();
    alert('已儲存到本機，但後端提交失敗，請查看控制台')
  }
})

// 自動填入功能：呼叫 dictionaryapi.dev 與 MyMemory 翻譯
async function autoFill(){
  const q = fWord.value.trim()
  if(!q) return alert('請先輸入要查詢的英文單字')
  autoFillBtn.disabled = true;autoFillBtn.textContent='查詢中...'
  try{
    // 1) 取得辭典資料
    const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`)
    let dict = null
    if(dictRes.ok) dict = await dictRes.json()

    // 取第一組意思
    if(dict && Array.isArray(dict) && dict[0]){
      const item = dict[0]
      const meaning = (item.meanings && item.meanings[0]) || null
      const def = (meaning && meaning.definitions && meaning.definitions[0]) || null
      fPos.value = meaning? meaning.partOfSpeech : ''
      fExample.value = def? (def.example||'') : ''
      fRoot.value = item.origin || ''
      // 先嘗試使用 MyMemory 翻譯單字
      try{
        const transRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=en|zh-TW`)
        if(transRes.ok){
          const t = await transRes.json()
          const translated = t.responseData && t.responseData.translatedText
          fChinese.value = translated || ''
        }
      }catch(e){
        console.warn('翻譯 API 錯誤',e)
      }
    }else{
      // 若辭典沒有資料，仍嘗試只翻譯單字
      const transRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=en|zh-TW`)
      if(transRes.ok){
        const t = await transRes.json()
        fChinese.value = t.responseData && t.responseData.translatedText
      }
      fPos.value = ''
      fExample.value = ''
      fRoot.value = ''
    }
  }catch(err){
    console.error(err);alert('自動填入發生錯誤，請查看控制台')
  }finally{
    autoFillBtn.disabled=false;autoFillBtn.textContent='自動填入'
  }
}

autoFillBtn.addEventListener('click',autoFill)

// 初始化
loadWords();renderCard();renderList()
