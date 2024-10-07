function mdparse(src, switchObject) {
  // decide the value what is end of line
  let eols = {
    "n": (src.match(/(?<!\r)\n/g) || []).length,
    "r": (src.match(/\r(?!\n)/g) || []).length,
    "rn": (src.match(/\r\n/g) || []).length
  }
  let eol = eols.n >= eols.r ? eols.n >= eols.rn ? `\n` : `\r\n` : eols.r <= eols.rn ? `\r\n` : `\r`
  let re_br = new RegExp(`  ${eol}>+ |  (${eol}|$)`, `g`)
  let work = src
  .replace(/\r?\n|\r(?!\n)/g, eol)
  .replace(/\\/g, `\\\\`)
  .replace(re_br, `<br>`)
  .split(eol)
  let iLast = work.length - 1
  let liContinuation = false
  let preEncContinuation = false
  let re_indent = null
  let arrowIcon = // for footnote
  `<svg class="user-content-return-arrow" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0, 0, 16, 21"><path d="M 0,0 V 2 h 8 c 3,0 6,3 6,6 0,3 -3,6 -6,6 H 7 v 2 h 1 c 4,0 8,-4 8,-8 0,-4 -4,-8 -8,-8 z"/><path d="M 6,21 7,19 3,15 7,11 6,9 0,15 Z"/></svg>`
  let re_blank = new RegExp(`^[ \\t]*$`)
  let re_header = new RegExp(`^#{1,6} `)
  let re_listBegin = new RegExp(`^([*+\\-] |\\d+\\. )(?!.*([*\\-_][ \\t]*){2,}).*$`)
  let re_list = new RegExp(`^[ \\t]*([*+\\-] |\\d+\\. )(\\[[ xX]\\])?`)
  let re_listUl = new RegExp(`^[ \\t]*[*+\\-] `)
  let re_listTl = new RegExp(`^[ \\t]*[*+\\-] \\[[ xX]\\]`)
  let re_listOl = new RegExp(`^[ \\t]*\\d+\\. `)
  let re_blockquote = new RegExp(`^>+`)
  let re_preEnc = new RegExp(`^\`\`\`|^~~~`)
  let re_preInd = new RegExp(`^[ \\t]+`)
  let re_table = new RegExp(`^\\|.*\\|$`)
  let re_footnote = new RegExp(`(?<!\\\\(\\\\\\\\)*)\\[.+?\\]: `)
  let re_hr = new RegExp(`^(?<!\\\\(\\\\\\\\)*)(\\*[ \\t]*|-[ \\t]*|_[ \\t]*){3,}$`)
  return classify(work)
  .then(rly => {
    return indent(rly)
  })
  .then(rly => {
    return escape(rly)
  })
  .then(rly => {
    return markupBlock(rly)
  })
  .then(rly => {
    return markupInline(rly)
  })
  .then(rly => {
    return footnote(rly)
  })
  /* classify
   ######     ##             ###        ######      ######     ####    ########    ##    ## 
  ##    ##    ##            ## ##      ##    ##    ##    ##     ##     ##           ##  ##  
  ##          ##           ##   ##     ##          ##           ##     ##            ####   
  ##          ##          ##     ##     ######      ######      ##     ######         ##    
  ##          ##          #########          ##          ##     ##     ##             ##    
  ##    ##    ##          ##     ##    ##    ##    ##    ##     ##     ##             ##    
   ######     ########    ##     ##     ######      ######     ####    ##             ##    
  */
  function classify() {
    let prop = []
    let i = 0
      return new Promise(resolve => {
      fn()
      function fn() {
        prop[i] = {}
        prop[i].indentVal = (work[i].match(/^[ \t]*/) || [])[0].length
        /*
          table of if
          1. blank
          2. header
          3. p
          4. li with ul as parent
          5. li with ol as parent
          6. blockquote
          7. pre with enclosing begin or end
          8. pre with enclosing continue
          9. pre with indentation
          10. table
          11. footnote
          12. hr
        */
        /* classify / blank
        ######     ##          #####     ###    ##    ##   ## 
        ##   ##    ##         ##   ##    ####   ##    ##  ##  
        ######     ##         #######    ## ##  ##    #####   
        ##   ##    ##         ##   ##    ##  ## ##    ##  ##  
        ######     #######    ##   ##    ##   ####    ##   ## 
        */
        if (
          !preEncContinuation
          &&
          re_blank.test(work[i])
        ) {
          prop[i].class = `blank`
          if (i < iLast) {
            i++
            fn()
          }
          else {
            resolve(prop)
          }
        }
        /* classify / heading
        ##   ##    #######     #####     ######     ##    ###    ##     ######  
        ##   ##    ##         ##   ##    ##   ##    ##    ####   ##    ##       
        #######    #####      #######    ##   ##    ##    ## ##  ##    ##   ### 
        ##   ##    ##         ##   ##    ##   ##    ##    ##  ## ##    ##    ## 
        ##   ##    #######    ##   ##    ######     ##    ##   ####     ######  
        */
        if (
          !preEncContinuation
          &&
          re_header.test(work[i])
        ) {
          prop[i].class = `header`
          prop[i].headerLv = work[i].match(/^#+/)[0].length
          if (i < iLast) {
            i++
            fn()
          }
          else {
            resolve(prop)
          }
        }
        /* classify / paragraph
        ######      #####     ######      #####      ######     ######      #####     ######     ##   ## 
        ##   ##    ##   ##    ##   ##    ##   ##    ##          ##   ##    ##   ##    ##   ##    ##   ## 
        ######     #######    ######     #######    ##   ###    ######     #######    ######     ####### 
        ##         ##   ##    ##   ##    ##   ##    ##    ##    ##   ##    ##   ##    ##         ##   ## 
        ##         ##   ##    ##   ##    ##   ##     ######     ##   ##    ##   ##    ##         ##   ## 
        */
        if (
          !preEncContinuation
          &&
          !re_blank.test(work[i])
          &&
          !re_header.test(work[i])
          &&
          !re_list.test(work[i])
          &&
          !re_blockquote.test(work[i])
          &&
          !re_preEnc.test(work[i])
          &&
          !re_preInd.test(work[i])
          &&
          !re_table.test(work[i])
          &&
          !re_footnote.test(work[i])
          &&
          !re_hr.test(work[i])
        ) {
          prop[i].class = `paragraph`
          if (i < iLast) {
            i++
            fn()
          }
          else {
            resolve(prop)
          }
        }
        /* classify /  li begin
        ##         ##            ######     #######     ######     ##    ###    ## 
        ##         ##            ##   ##    ##         ##          ##    ####   ## 
        ##         ##            ######     #####      ##   ###    ##    ## ##  ## 
        ##         ##            ##   ##    ##         ##    ##    ##    ##  ## ## 
        #######    ##            ######     #######     ######     ##    ##   #### 
        */
        if (
          !preEncContinuation
          &&
          !liContinuation
          &&
          re_listBegin.test(work[i])
        ) {
          prop[i].class = `list`
          if (re_listUl.test(work[i])) {
            prop[i].parent = `ul`
          }
          if (re_listOl.test(work[i])) {
            prop[i].parent = `ol`
          }
          if (re_listTl.test(work[i])) {
            prop[i].task = true
          }
          liContinuation = true
          if (i < iLast) {
            i++
            fn()
          }
          else {
            resolve(prop)
          }
        }
        /* classify / li-ul in continue
        ##         ##             ##    ##    ##                 ##    ###    ##             ######     ######     ###    ##    ########    ##    ###    ##    ##    ##    ####### 
        ##         ##             ##    ##    ##                 ##    ####   ##            ##         ##    ##    ####   ##       ##       ##    ####   ##    ##    ##    ##      
        ##         ##    #####    ##    ##    ##                 ##    ## ##  ##            ##         ##    ##    ## ##  ##       ##       ##    ## ##  ##    ##    ##    #####   
        ##         ##             ##    ##    ##                 ##    ##  ## ##            ##         ##    ##    ##  ## ##       ##       ##    ##  ## ##    ##    ##    ##      
        #######    ##              ######     #######            ##    ##   ####             ######     ######     ##   ####       ##       ##    ##   ####     ######     ####### 
        */
        if (
          !preEncContinuation
          &&
          liContinuation
          &&
          re_listUl.test(work[i])
        ) {
          prop[i].class = `list`
          prop[i].parent = `ul`
          if (!re_list.test(work[i + 1])) {
            liContinuation = false
          }
          if (re_listTl.test(work[i])) {
            prop[i].task = true
          }
          if (i < iLast) {
            i++
            fn()
          }
          else {
            resolve(prop)
          }
        }
        /* classify / li-ol in continue
        ##         ##              ######     ##                 ##    ###    ##             ######     ######     ###    ##    ########    ##    ###    ##    ##    ##    ####### 
        ##         ##             ##    ##    ##                 ##    ####   ##            ##         ##    ##    ####   ##       ##       ##    ####   ##    ##    ##    ##      
        ##         ##    #####    ##    ##    ##                 ##    ## ##  ##            ##         ##    ##    ## ##  ##       ##       ##    ## ##  ##    ##    ##    #####   
        ##         ##             ##    ##    ##                 ##    ##  ## ##            ##         ##    ##    ##  ## ##       ##       ##    ##  ## ##    ##    ##    ##      
        #######    ##              ######     #######            ##    ##   ####             ######     ######     ##   ####       ##       ##    ##   ####     ######     ####### 
        */
        if (
          !preEncContinuation
          &&
          liContinuation
          &&
          re_listOl.test(work[i])
        ) {
          prop[i].class = `list`
          prop[i].parent = `ol`
          if (!re_list.test(work[i + 1])) {
            liContinuation = false
          }
          if (i < iLast) {
            i++
            fn()
          }
          else {
            resolve(prop)
          }
        }
        /* classify / blockquote
        ######     ##          ######      ######    ##   ##     ######     ##    ##     ######     ########    ####### 
        ##   ##    ##         ##    ##    ##         ##  ##     ##    ##    ##    ##    ##    ##       ##       ##      
        ######     ##         ##    ##    ##         #####      ##    ##    ##    ##    ##    ##       ##       #####   
        ##   ##    ##         ##    ##    ##         ##  ##     ## ## ##    ##    ##    ##    ##       ##       ##      
        ######     #######     ######      ######    ##   ##     ######      ######      ######        ##       ####### 
                                                                    ##                                                  
        */
        if (
          !preEncContinuation
          &&
          re_blockquote.test(work[i])
        ) {
          prop[i].class = `blockquote`
          prop[i].bqStack = work[i].match(/^>+/)[0].length
          if (i < iLast) {
            i++
            fn()
          }
          else {
            resolve(prop)
          }
        }
        /* classify / pre enc begin or end
        ######     ######     #######            #######    ###    ##     ######            ######     #######     ######     ##    ###    ##             ######     ######             #######    ###    ##    ######  
        ##   ##    ##   ##    ##                 ##         ####   ##    ##                 ##   ##    ##         ##          ##    ####   ##            ##    ##    ##   ##            ##         ####   ##    ##   ## 
        ######     ######     #####              #####      ## ##  ##    ##                 ######     #####      ##   ###    ##    ## ##  ##            ##    ##    ######             #####      ## ##  ##    ##   ## 
        ##         ##   ##    ##                 ##         ##  ## ##    ##                 ##   ##    ##         ##    ##    ##    ##  ## ##            ##    ##    ##   ##            ##         ##  ## ##    ##   ## 
        ##         ##   ##    #######            #######    ##   ####     ######            ######     #######     ######     ##    ##   ####             ######     ##   ##            #######    ##   ####    ######  
        */
        if (
          re_preEnc.test(work[i])
        ) {
          prop[i].class = `preEnc`
          if (!preEncContinuation) {
            prop[i].site = `begin`
            preEncContinuation = true
            prop[i].preGrp = i
            prop[i].lang = work[i].replace(/(```|~~~)[ \t]*/, ``)
          }
          else {
            prop[i].site = `end`
            preEncContinuation = false
            prop[i].preGrp = prop[i - 1].preGrp
          }
          if (i < iLast) {
            i++
            fn()
          }
          else {
            resolve(prop)
          }
        }
        /* classify / pre enc continue
        ######     ######     #######            #######    ###    ##     ######             ######     ######     ###    ##    ########    ##    ###    ##    ##    ##    ####### 
        ##   ##    ##   ##    ##                 ##         ####   ##    ##                 ##         ##    ##    ####   ##       ##       ##    ####   ##    ##    ##    ##      
        ######     ######     #####              #####      ## ##  ##    ##                 ##         ##    ##    ## ##  ##       ##       ##    ## ##  ##    ##    ##    #####   
        ##         ##   ##    ##                 ##         ##  ## ##    ##                 ##         ##    ##    ##  ## ##       ##       ##    ##  ## ##    ##    ##    ##      
        ##         ##   ##    #######            #######    ##   ####     ######             ######     ######     ##   ####       ##       ##    ##   ####     ######     ####### 
        */
        if (
          preEncContinuation
          &&
          !re_preEnc.test(work[i])
        ) {
          prop[i].class = `preEnc`
          prop[i].site = `middle`
          prop[i].preGrp = prop[i - 1].preGrp
          if (i < iLast) {
            i++
            fn()
          }
          else {
            resolve(prop)
          }
        }
        /* classify / pre ind
        ######     ######     #######            ##    ###    ##    ######  
        ##   ##    ##   ##    ##                 ##    ####   ##    ##   ## 
        ######     ######     #####              ##    ## ##  ##    ##   ## 
        ##         ##   ##    ##                 ##    ##  ## ##    ##   ## 
        ##         ##   ##    #######            ##    ##   ####    ######  
        */
        if (
          !preEncContinuation
          &&
          !liContinuation
          &&
          re_preInd.test(work[i])
          &&
          (
            i === 0
            ||
            (
              i !== 0
              &&
              prop[i - 1].class !== `list`
            )
          )
        ) {
          prop[i].class = `preInd`
          if (prop[i - 1].class === `preInd` && re_preInd.test(work[i + 1])) {
            prop[i].site = `middle`
          }
          if (prop[i - 1].class !== `preInd` && re_preInd.test(work[i + 1])) {
            prop[i].site = `begin`
          }
          if (prop[i - 1].class === `preInd` && !re_preInd.test(work[i + 1])) {
            prop[i].site = `end`
          }
          if (prop[i - 1].class !== `preInd` && !re_preInd.test(work[i + 1])) {
            prop[i].site = `az`
          }
          if (i < iLast) {
            i++
            fn()
          }
          else {
            resolve(prop)
          }
        }
        /* classify / tqble
        ########     #####     ######     ##         ####### 
           ##       ##   ##    ##   ##    ##         ##      
           ##       #######    ######     ##         #####   
           ##       ##   ##    ##   ##    ##         ##      
           ##       ##   ##    ######     #######    ####### 
        */
        if (
          !preEncContinuation
          &&
          re_table.test(work[i])
        ) {
          prop[i].class = `table`
          let promiseArray = []
          Promise.all(promiseArray)
          .then(() => {
            if (i < iLast) {
              i++
              fn()
            }
            else {
              resolve(prop)
            }
          })
          promiseArray.push(
            new Promise(resolve => {
              // continue
              if (prop[i - 1].class === `table` && re_table.test(work[i + 1])) {
                prop[i].site = `middle`
                prop[i].tGrp = prop[i - 1].tGrp
                procHLine()
                resolve()
              }
              // begin
              if (prop[i - 1].class !== `table` && re_table.test(work[i + 1])) {
                prop[i].site = `begin`
                prop[i].tGrp = i
                procHLine()
                resolve()
              }
              // end
              if (prop[i - 1].class === `table` && !re_table.test(work[i + 1])) {
                prop[i].site = `end`
                prop[i].tGrp = prop[i - 1].tGrp
                procHLine()
                resolve()
              }
              // begin & end
              if (prop[i - 1].class !== `table` && !re_table.test(work[i + 1])) {
                prop[i].site = `az`
                prop[i].tGrp = i
                procHLine()
                resolve()
              }
              // inherit to begining with horizontal line
              if (prop[i - 1].hLine === `current` && prop[i - 1].beginWithHLine) {
                prop[i].beginWithHLine = true
                resolve()
              }
              function procHLine() {
                if (prop[i - 1].hLine === `current` || prop[i - 1].hLine === `after`) {
                  prop[i].hLine = `after`
                }
                else {
                  prop[i].hLine = `unrelated`
                }
              }
            })
          )
          promiseArray.push(
            new Promise(resolve => {
              if (/^\|([ :]?-+[ :]?\|)+/.test(work[i])) {
                prop[i].hLine = `current`
                let promiseArray = []
                Promise.all(promiseArray)
                .then(() => resolve())
                promiseArray.push(
                  new Promise(resolve => {
                    let w = prop[prop[i].tGrp].cellAlign = work[i]
                    .match(/(?<=(?<!\\)(?<!(\\\\)*\\)\|).*?(?=(?<!\\)(?<!(\\\\)*\\)\|)/g)
                    .map(rly =>
                      rly
                      .replace(/^[ \t]*-+[ \t]*$/, ``)
                      .replace(/^[ \t]*:-+[ \t]*$/, `style="text-align: left;"`)
                      .replace(/^[ \t]*-+:[ \t]*$/, `style="text-align: right;"`)
                      .replace(/^[ \t]*:-+:[ \t]*$/, `style="text-align: center;"`)
                    )
                    resolve(w)
                  })
                )
                promiseArray.push(
                  new Promise(resolve => {
                    fn1(i)
                    function fn1(iL) {
                      iL--
                      if (prop[iL].tGrp === prop[i].tGrp) {
                        prop[iL].hLine = `before`
                        fn1(iL)
                      }
                      if (prop[iL].tGrp !== prop[i].tGrp && iL === i - 1) {
                        prop[i].beginWithHLine = true
                        resolve()
                      }
                    }
                  })
                )
              }
              else {
                resolve()
              }
            })
          )
        }
        /* classify / footnote
        #######     ######      ######     ########    ###    ##     ######     ########    ####### 
        ##         ##    ##    ##    ##       ##       ####   ##    ##    ##       ##       ##      
        #####      ##    ##    ##    ##       ##       ## ##  ##    ##    ##       ##       #####   
        ##         ##    ##    ##    ##       ##       ##  ## ##    ##    ##       ##       ##      
        ##          ######      ######        ##       ##   ####     ######        ##       ####### 
        */
        if (
          !preEncContinuation
          &&
          re_footnote.test(work[i])
        ) {
          prop[i].class = `footnote`
          if (i < iLast) {
            i++
            fn()
          }
          else {
            resolve(prop)
          }
        }
        /* classify / horizontal ruler
        ##   ##     ######     ######     ##    #######     ######     ###    ##    ########     #####     ##                 ######     ##    ##        ##         #######    ######  
        ##   ##    ##    ##    ##   ##    ##       ###     ##    ##    ####   ##       ##       ##   ##    ##                 ##   ##    ##    ##        ##         ##         ##   ## 
        #######    ##    ##    ######     ##      ###      ##    ##    ## ##  ##       ##       #######    ##                 ######     ##    ##        ##         #####      ######  
        ##   ##    ##    ##    ##   ##    ##     ###       ##    ##    ##  ## ##       ##       ##   ##    ##                 ##   ##    ##    ##        ##         ##         ##   ## 
        ##   ##     ######     ##   ##    ##    #######     ######     ##   ####       ##       ##   ##    #######            ##   ##     ######         #######    #######    ##   ## 
        */
        if (
          !preEncContinuation
          &&
          re_hr.test(work[i])
        ) {
          prop[i].class = `horizontalRuler`
          if (i < iLast) {
            i++
            fn()
          }
          else {
            resolve(prop)
          }
        }
      }
    })
  }
  /* indent
   ####    ##    ##    ########     ########    ##    ##    ######## 
    ##     ###   ##    ##     ##    ##          ###   ##       ##    
    ##     ####  ##    ##     ##    ##          ####  ##       ##    
    ##     ## ## ##    ##     ##    ######      ## ## ##       ##    
    ##     ##  ####    ##     ##    ##          ##  ####       ##    
    ##     ##   ###    ##     ##    ##          ##   ###       ##    
   ####    ##    ##    ########     ########    ##    ##       ##    
  */
  function indent(prop) {
    let isArray = [] // is = indentation by space
    let itArray = [] // it = indentation by tab
    for (let i in prop) {
      if (prop[i].class !== `preEnc` && prop[i].class !== `preInd`) {
        isArray.push((work[i].match(/^ +/) || [``])[0].length)
        itArray.push((work[i].match(/^\t+/) || [``])[0].length)
      }
    }
    isArray = [... new Set(isArray)].sort((a, b) => a - b)
    itArray = [... new Set(itArray)].sort((a, b) => a - b)
    let isDiff = isArray.reduce((a, b) => {return (a[0].push(b - a[1]), a[1] = b, a)}, [[], 0]).shift()
    let itDiff = itArray.reduce((a, b) => {return (a[0].push(b - a[1]), a[1] = b, a)}, [[], 0]).shift()
    let c = (a, i, b) => (a[i] ? a[i].add(b) : a[i] = new Set(b), i)
    let isNum = [...isDiff.reduce(function(a, b) {return (b = String(b), this.set(b, c(a, (this.get(b) + 1 || 1), b)), a)}.bind(new Map), []).pop()].map(rly => Number(rly)).reduce((a, b) => b !== 0 ? (b < a ? b : a) : a, Infinity)
    let itNum = [...itDiff.reduce(function(a, b) {return (b = String(b), this.set(b, c(a, (this.get(b) + 1 || 1), b)), a)}.bind(new Map), []).pop()].map(rly => Number(rly)).reduce((a, b) => b !== 0 ? (a < b ? a : b) : a, Infinity)
    for (let i in prop) {
      let indentBlob = (work[i].match(/^[ \t]*/) || [``])[0]
      prop[i].indentNum = Math.floor(isNum !== 0 ? (indentBlob.match(/ /g) || []).length / isNum : 0) + Math.floor(itNum !== 0 ? (indentBlob.match(/\t/g) || []).length / itNum : 0)
    }
    return prop
  }
  /* escape
  ########     ######      ######        ###       ########     ######## 
  ##          ##    ##    ##    ##      ## ##      ##     ##    ##       
  ##          ##          ##           ##   ##     ##     ##    ##       
  ######       ######     ##          ##     ##    ########     ######   
  ##                ##    ##          #########    ##           ##       
  ##          ##    ##    ##    ##    ##     ##    ##           ##       
  ########     ######      ######     ##     ##    ##           ######## 
  */
  function escape(prop) {
    let tagList = /^\/?(html|head|title|base|link|style|meta|body|article|section|nav|aside|h1|h2|h3|h4|h5|h6|header|footer|address|p|hr|pre|blockquote|ol|ul|li|dl|dt|dd|figure|figcaption|main|div|a|em|strong|small|s|cite|q|dfn|abbr|code|var|samp|kbd|data|sub|sup|time|i|b|u|mark|ruby|rb|rt|rtc|rp|bdi|bdo|span|br|wbr|ins|del|img|picture|iframe|embed|object|param|video|audio|track|source|map|area|table|caption|colgroup|col|tbody|thead|tfoot|tr|td|th|form|fieldset|legend|label|input|select|option|optgroup|textarea|button|datalist|output|progress|meter|script|noscript|template|canvas|details|summary|menu|menuitem)$/
    for (let i in prop) {
      if (prop[i].class === `preEnc` || prop[i].class === `preInd`) {
        work[i] = work[i]
        .replace(/<.+?>/g, rly => {
          if (!tagList.test(rly.match(/(?<=<).+?(?=>)/)[0])) return rly.replace(/<(\/?.*)>/g, `&lt;$1&gt;`)
          else return rly
        })
      }
      else {
        work[i] = work[i]
        .replace(/(?<!\\(?:\\\\)*)\\<(.*?)>/g, `&lt;$1&gt;`)
        .replace(/(?<!\\(?:\\\\)*)\\</g, `&lt;`)
        .replace(/(?<!\\(?:\\\\)*)\\>/g, `&gt;`)
        .replace(/(?<!\\(?:\\\\)*)\\(.)/g, `$1`)
        .replace(/\\\\/g, `\\`)
      }
    }
    return prop
  }
  /*
  ########     ##           #######      ######     ##    ##               ##          ########    ##     ##    ########    ##                 ######      #######     ##    ##    ########    ########    ##    ##    ######## 
  ##     ##    ##          ##     ##    ##    ##    ##   ##                ##          ##          ##     ##    ##          ##                ##    ##    ##     ##    ###   ##       ##       ##          ###   ##       ##    
  ##     ##    ##          ##     ##    ##          ##  ##                 ##          ##          ##     ##    ##          ##                ##          ##     ##    ####  ##       ##       ##          ####  ##       ##    
  ########     ##          ##     ##    ##          #####       #######    ##          ######      ##     ##    ######      ##                ##          ##     ##    ## ## ##       ##       ######      ## ## ##       ##    
  ##     ##    ##          ##     ##    ##          ##  ##                 ##          ##           ##   ##     ##          ##                ##          ##     ##    ##  ####       ##       ##          ##  ####       ##    
  ##     ##    ##          ##     ##    ##    ##    ##   ##                ##          ##            ## ##      ##          ##                ##    ##    ##     ##    ##   ###       ##       ##          ##   ###       ##    
  ########     ########     #######      ######     ##    ##               ########    ########       ###       ########    ########           ######      #######     ##    ##       ##       ########    ##    ##       ##    
  */
  function markupBlock(prop) {
    let i = 0
    let ssAccum = []
    let liAccum = []
    let fContentKey = []
    let fContentWord = []
    if (preEncContinuation) {
      work = work.concat([`\`\`\``])
      prop = prop.concat([{"class": "preEnc", "site": "end"}])
    }
    return [new Promise(resolve => {
      fn()
      function fn() {
        switch (prop[i].class) {
          /* block-level content / blank
          ######     ##          #####     ###    ##    ##   ## 
          ##   ##    ##         ##   ##    ####   ##    ##  ##  
          ######     ##         #######    ## ##  ##    #####   
          ##   ##    ##         ##   ##    ##  ## ##    ##  ##  
          ######     #######    ##   ##    ##   ####    ##   ## 
          */
          case `blank`:
            if (i < iLast) {
              i++
              fn()
            }
            else {
              resolve(prop)
            }
            break
          /* block-level content / heading
          ##   ##    #######     #####     ######     ##    ###    ##     ######  
          ##   ##    ##         ##   ##    ##   ##    ##    ####   ##    ##       
          #######    #####      #######    ##   ##    ##    ## ##  ##    ##   ### 
          ##   ##    ##         ##   ##    ##   ##    ##    ##  ## ##    ##    ## 
          ##   ##    #######    ##   ##    ######     ##    ##   ####     ######  
          */
          case `header`:
            let section = ``
            if (switchObject.section) {
              if (prop[i].headerLv < ssAccum[ssAccum.length - 1] || i === iLast) {
                while (prop[i].headerLv <= ssAccum[ssAccum.length - 1]) {
                  section += `</section>`
                  ssAccum.splice(-1, 1)
                }
                section += ssAccum.length === 0 ? `` : `<section>`
              }
              else if (prop[i].headerLv > (ssAccum[ssAccum.length - 1] || 0)) {
                section = `<section>`
                ssAccum = ssAccum.concat(prop[i].headerLv)
              }
              else if (prop[i].headerLv === ssAccum[ssAccum.length - 1]) {
                section = `</section><section>`
              }
            }
            work[i] = `${section}<h${prop[i].headerLv}>${work[i].replace(/^#+/, ``)}</h${prop[i].headerLv}>`
            if (i < iLast) {
              i++
              fn()
            }
            else {
              resolve(prop)
            }
            break
          /* block-level content / paragraph
          ######      #####     ######      #####      ######     ######      #####     ######     ##   ## 
          ##   ##    ##   ##    ##   ##    ##   ##    ##          ##   ##    ##   ##    ##   ##    ##   ## 
          ######     #######    ######     #######    ##   ###    ######     #######    ######     ####### 
          ##         ##   ##    ##   ##    ##   ##    ##    ##    ##   ##    ##   ##    ##         ##   ## 
          ##         ##   ##    ##   ##    ##   ##     ######     ##   ##    ##   ##    ##         ##   ## 
          */
          case `paragraph`:
            if (
              i === iLast
              ||
              prop[i + 1].class !== `paragraph`
              ||
              switchObject.permissive
            ) {
              work[i] = `<p>${work[i]}</p>`
              if (i < iLast) {
                i++
                fn()
              }
              else {
                resolve(prop)
              }
            }
            else {
              work[i + 1] = `${work[i]}${!/<br>$/.test(work[i]) ? ` ` : ``}${work[i + 1]}`
              work = work.slice(0, i).concat(work.slice(i + 1))
              prop = prop.slice(0, i).concat(prop.slice(i + 1))
              iLast--
              if (i < iLast) {
                fn()
              }
              else {
                resolve(prop)
              }
            }
            break
          /* block-level content / list
          ##         ##    #######    ######## 
          ##         ##    ##            ##    
          ##         ##    #######       ##    
          ##         ##         ##       ##    
          #######    ##    #######       ##    
          */
          case `list`:
            work[i] = list(prop, i)
            if (i < iLast) {
              i++
              fn()
            }
            else {
              resolve(prop)
            }
            break
          /* block-level content / blockquote
          ######     ##          ######      ######    ##   ##     ######     ##    ##     ######     ########    ####### 
          ##   ##    ##         ##    ##    ##         ##  ##     ##    ##    ##    ##    ##    ##       ##       ##      
          ######     ##         ##    ##    ##         #####      ##    ##    ##    ##    ##    ##       ##       #####   
          ##   ##    ##         ##    ##    ##         ##  ##     ## ## ##    ##    ##    ##    ##       ##       ##      
          ######     #######     ######      ######    ##   ##     ######      ######      ######        ##       ####### 
                                                                      ##                                                  
          */
          case `blockquote`:
            work[i] = blockquote(prop, i)
            if (i < iLast) {
              i++
              fn()
            }
            else {
              resolve(prop)
            }
            break
            /* block-level content / pre enclosing
            ######     ######     #######            #######    ###    ##     ###### 
            ##   ##    ##   ##    ##                 ##         ####   ##    ##      
            ######     ######     #####              #####      ## ##  ##    ##      
            ##         ##   ##    ##                 ##         ##  ## ##    ##      
            ##         ##   ##    #######            #######    ##   ####     ###### 
            */          case `preEnc`:
            if (prop[i].site === `middle` && prop[i + 1].site !== `end`) {
              work[i] = `${work[i]}`
              if (i < iLast) {
                i++
                fn()
              }
              else {
                resolve(prop)
              }
            }
            if (prop[i].site === `begin` && prop[i + 1].site !== `end`) {
              work = work.slice(0, i).concat(work.slice(i + 1))
              prop = prop.slice(0, i).concat(prop.slice(i + 1))
              iLast--
              work[i] = prop[i].lang !== `` ? `<pre><code class="language-${prop[i].lang}">${work[i]}` : `<pre><code>${work[i]}`
              if (i < iLast) {
                fn()
              }
              else {
                resolve(prop)
              }
            }
            if (prop[i].site !== `begin` && prop[i + 1].site === `end`) {
              work = work.slice(0, i + 1).concat(work.slice(i + 2))
              prop = prop.slice(0, i + 1).concat(prop.slice(i + 2))
              iLast--
              work[i] = `${work[i]}</code></pre>`
              if (i < iLast) {
                fn()
              }
              else {
                resolve(prop)
              }
            }
            if (prop[i].site === `begin` && prop[i + 1].site === `end`) {
              work = work.slice(0, i).concat(work.slice(i + 2))
              prop = prop.slice(0, i).concat(prop.slice(i + 2))
              iLast--
              iLast--
              work[i] = prop[i].lang !== `` ? `<pre><code class="language-${prop[i].lang}"><br></code></pre>` : `<pre><code><br></code></pre>`
              if (i < iLast) {
                fn()
              }
              else {
                resolve(prop)
              }
            }
            break
          /* block-level content / pre indentation
          ######     ######     #######            ##    ###    ##    ######  
          ##   ##    ##   ##    ##                 ##    ####   ##    ##   ## 
          ######     ######     #####              ##    ## ##  ##    ##   ## 
          ##         ##   ##    ##                 ##    ##  ## ##    ##   ## 
          ##         ##   ##    #######            ##    ##   ####    ######  
          */
          case `preInd`:
            /*
              table of if
              pre...
              1. continue
              2. begin, not end
              3. end, not begin
              4. begin, not end
            */
            // pre continue
            if (
              prop[i].site === `middle`
            ) {
              work[i] = `${work[i].replace(re_indent, ``)}`
            }
            // pre begin, not end
            if (
              prop[i].site === `begin`
            ) {
              work[i] = `<pre><code>${work[i].replace(re_indent, ``)}`
            }
            // pre end, not begin
            if (
              prop[i].site === `end`
            ) {
              work[i] = `${work[i].replace(re_indent, ``)}</code></pre>`
            }
            // pre begin and end
            if (
              prop[i].site === `az`
            ) {
              work[i] = `<pre><code>${work[i].replace(re_indent, ``)}</code></pre>`
            }
            if (i < iLast) {
              i++
              fn()
            }
            else {
              resolve(prop)
            }
            break
          /* block-level content / table
          ########     #####     ######     ##         ####### 
             ##       ##   ##    ##   ##    ##         ##      
             ##       #######    ######     ##         #####   
             ##       ##   ##    ##   ##    ##         ##      
             ##       ##   ##    ######     #######    ####### 
          */
          case `table`:
            if (prop[i].hLine !== `current`) {
              let rowFront = ``
              let rowBack = ``
              let cellFrontTag = ``
              let cellBack = ``
              //
              // continue
              //
              if (prop[i].site === `middle` && prop[i].hLine !== `current`) {
                // continue before horizontal line
                if (prop[i].hLine === `before`) {
                  cellFrontTag = `th`
                  cellBack = `</th>`
                }
                // continue after horizontal line
                if (prop[i].hLine === `after` || prop[i].hLine === `unrelated`) {
                  cellFrontTag = `td`
                  cellBack = `</td>`
                }
                // begin with horizontal line
                if (prop[i].beginWithHLine) {
                  rowFront = `<table><tbody>`
                  cellFrontTag = `td`
                  cellBack = `</td>`
                }
                // end with horizontal line
                if (prop[i].hLine === `before` && prop[i + 1].hLine === `current` && prop[i + 1].site === `end`) {
                  rowBack = `</tbody></table>`
                  cellFrontTag = `th`
                  cellBack = `</th>`
                }
              }
              //
              // begin
              //
              if (prop[i].site === `begin`) {
                // begin before horizontal line
                if (prop[i].hLine === `before` && prop[i + 1].hLine !== `current`) {
                  rowFront = `<table><thead>`
                  cellFrontTag = `th`
                  cellBack = `</th>`
                }
                // begin just before horizontal line
                if (prop[i].hLine === `before` && prop[i + 1].hLine === `current`) {
                  rowFront = `<table><thead>`
                  rowBack = `</thead>`
                  cellFrontTag = `th`
                  cellBack = `</th>`
                }
                // begin unrelated to horizotal line
                if (prop[i].hLine === `unrelated`) {
                  rowFront = `<table><tbody>`
                  cellFrontTag = `td`
                  cellBack = `</td>`
                }
                // begin just before horizotal line ending
                if (prop[i].hLine === `before` && prop[i + 1].hLine === `current` && prop[i + 1].site === `end`) {
                  rowFront = `<table><thead>`
                  rowBack = `</thead></table>`
                  cellFrontTag = `td`
                  cellBack = `</td>`
                }
              }
              //
              // end
              //
              if (prop[i].site === `end`) {
                // end standard
                if (prop[i].hLine === `after` && prop[i - 1].hLine === `after`) {
                  rowBack = `</tbody></table>`
                  cellFrontTag = `td`
                  cellBack = `</td>`
                }
                // end just after horizontal line
                if (prop[i].hLine === `after` && prop[i - 1].hLine === `before`) {
                  rowFront = `<tbody>`
                  rowBack = `</tbody></table>`
                  cellFrontTag = `td`
                  cellBack = `</td>`
                }
                // end just after horizontal line begining
                if (prop[i].beginWithHLine) {
                  rowFront = `<table><tbody>`
                  rowBack = `</tbody></table>`
                  cellFrontTag = `td`
                  cellBack = `</td>`
                }
                // end unrelated to horizotal line
                if (prop[i].hLine === `unrelated`) {
                  rowBack = `</tbody></table>`
                  cellFrontTag = `td`
                  cellBack = `</td>`
                }
              }
              //
              // begin & end
              //
              if (prop[i].site === `az`) {
                rowFront = `<table><tbody>`
                rowBack = `</tbody></table>`
                cellFrontTag = `td`
                cellBack = `</td>`
              }
              //
              // execute replace
              //
              work[i] = work[i]
              .replace(/^(?<!(\\\\)*\\)\||(?<!\\)(?<!(\\\\)*\\)\|$/, ``)
              .split(/[ \t]*(?<!\\)(?<!(\\\\)*\\)\|[ \t]*/)
              .map((rly, j) => {console.log(prop[98].cellAlign);console.log(prop[prop[i].tGrp].cellAlign);let w = `<${cellFrontTag} ${prop[prop[i].tGrp].cellAlign[j]}>${rly}${cellBack}`;console.log(w);return w})
              .replace(/^/, `${rowFront}<tr>`)
              .replace(/$/, `</tr>${rowBack}`)
              if (i < iLast) {
                i++
                fn()
              }
              else {
                resolve(prop)
              }
            }
            else {
              work = work.slice(0, i).concat(work.slice(i + 1))
              prop = prop.slice(0, i).concat(prop.slice(i + 1))
              iLast--
              if (i < iLast) {
                fn()
              }
              else {
                resolve(prop)
              }
            }
            break
          /* block-level content / footnote
          #######     ######      ######     ########    ###    ##     ######     ########    ####### 
          ##         ##    ##    ##    ##       ##       ####   ##    ##    ##       ##       ##      
          #####      ##    ##    ##    ##       ##       ## ##  ##    ##    ##       ##       #####   
          ##         ##    ##    ##    ##       ##       ##  ## ##    ##    ##       ##       ##      
          ##          ######      ######        ##       ##   ####     ######        ##       ####### 
          */
          case `footnote`:
            fContentKey = fContentKey.concat([(work[i].match(/(?<=\[\^).+(?=\]:)/) || [])[0]])
            fContentWord = fContentWord.concat([work[i].replace(/^\[\^.+?\]: ?/, ``)])
            work = work.slice(0, i).concat(work.slice(i + 1))
            prop = prop.slice(0, i).concat(prop.slice(i + 1))
            iLast--
            if (i < iLast) {
              fn()
            }
            else {
              resolve(prop)
            }
            break
          /* block-level content / horizontal ruler
          ##   ##     ######     ######     ##    #######     ######     ###    ##    ########     #####     ##                 ######     ##    ##    ##         #######    ######  
          ##   ##    ##    ##    ##   ##    ##       ###     ##    ##    ####   ##       ##       ##   ##    ##                 ##   ##    ##    ##    ##         ##         ##   ## 
          #######    ##    ##    ######     ##      ###      ##    ##    ## ##  ##       ##       #######    ##                 ######     ##    ##    ##         #####      ######  
          ##   ##    ##    ##    ##   ##    ##     ###       ##    ##    ##  ## ##       ##       ##   ##    ##                 ##   ##    ##    ##    ##         ##         ##   ## 
          ##   ##     ######     ##   ##    ##    #######     ######     ##   ####       ##       ##   ##    #######            ##   ##     ######     #######    #######    ##   ## 
          */
          case `horizontalRuler`:
            work[i] = `<hr>`
            if (i < iLast) {
              i++
              fn()
            }
            else {
              resolve(prop)
            }
            break
          /* block-level content / unmatched
          ##    ##    ###    ##    ###    ###     #####     ########     ######    ##   ##    #######    ######  
          ##    ##    ####   ##    ####  ####    ##   ##       ##       ##         ##   ##    ##         ##   ## 
          ##    ##    ## ##  ##    ## #### ##    #######       ##       ##         #######    #####      ##   ## 
          ##    ##    ##  ## ##    ##  ##  ##    ##   ##       ##       ##         ##   ##    ##         ##   ## 
           ######     ##   ####    ##      ##    ##   ##       ##        ######    ##   ##    #######    ######  
          */
          case `unmatched`:
            if (i < iLast) {
              i++
              fn()
            }
            else {
              resolve(prop)
            }
            break
          /* block-level content / default case
          ######     #######    #######     #####     ##    ##    ##         ########             ######     #####     #######    ####### 
          ##   ##    ##         ##         ##   ##    ##    ##    ##            ##               ##         ##   ##    ##         ##      
          ##   ##    #####      #####      #######    ##    ##    ##            ##               ##         #######    #######    #####   
          ##   ##    ##         ##         ##   ##    ##    ##    ##            ##               ##         ##   ##         ##    ##      
          ######     #######    ##         ##   ##     ######     #######       ##                ######    ##   ##    #######    ####### 
          */
          default:
            console.log(`unexpected error occured at line ${i}\n${work[i]}`)
            if (i < iLast) {
              i++
              fn()
            }
            else {
              resolve(prop)
            }
          // this step was made by "switch"
        }
      }
    }), fContentKey, fContentWord]
    /* block-level content / list
    ##         ##    #######    ######## 
    ##         ##    ##            ##    
    ##         ##    #######       ##    
    ##         ##         ##       ##    
    #######    ##    #######       ##    
    */
    function list(prop, i) {
      //
      // now not 1st & last line
      //
      if (i > 0 && i < iLast) {
        // li continue
        if (
          (
            prop[i].parent === prop[i - 1].parent
            ||
            prop[i].indentNum < prop[i - 1].indentNum
          )
          &&
          prop[i].indentNum <= prop[i - 1].indentNum
          &&
          (
            prop[i].parent === prop[i + 1].parent
            ||
            prop[i].indentNum < prop[i + 1].indentNum
          )
          &&
          prop[i].indentNum <= prop[i + 1].indentNum
        ) {
          return `${liFront(prop, i)}${work[i].replace(re_list, ``)}</li>`
        }
        // li begin
        if (
          (
            (
              prop[i].parent !== prop[i - 1].parent
              &&
              prop[i].indentNum === prop[i - 1].indentNum
            )
            ||
            prop[i].indentNum > prop[i - 1].indentNum
          )
          &&
          (
            prop[i].parent === prop[i + 1].parent
            ||
            prop[i].indentNum < prop[i + 1].indentNum
          )
          &&
          prop[i].indentNum <= prop[i + 1].indentNum
        ) {
          liAccum = liAccum.concat([prop[i].parent])
          return `<${prop[i].parent}>${liFront(prop, i)}${work[i].replace(re_list, ``)}</li>`
        }
        // li end
        if (
          (
            prop[i].parent === prop[i - 1].parent
            ||
            prop[i].indentNum < prop[i - 1].indentNum
          )
          &&
          prop[i].indentNum <= prop[i - 1].indentNum
          &&
          (
            (
              prop[i].parent !== prop[i + 1].parent
              &&
              prop[i].indentNum === prop[i + 1].indentNum
            )
            ||
            prop[i].indentNum > prop[i + 1].indentNum
          )
        ) {
          return `${liFront(prop, i)}${work[i].replace(re_list, ``)}</li>${liEnd(prop, i)}`
        }
        // li begin & end
        if (
          (
            (
              prop[i].parent !== prop[i - 1].parent
              &&
              prop[i].indentNum === prop[i - 1].indentNum
            )
            ||
            prop[i].indentNum > prop[i - 1].indentNum
          )
          &&
          (
            (
              prop[i].parent !== prop[i + 1].parent
              &&
              prop[i].indentNum === prop[i + 1].indentNum
            )
            ||
            prop[i].indentNum > prop[i + 1].indentNum
          )
        ) {
          liAccum = liAccum.concat([prop[i].parent])
          return `<${prop[i].parent}>${liFront(prop, i)}${work[i].replace(re_list, ``)}</li>${liEnd(prop, i)}`
        }
      }
      //
      // now 1st line, not last line
      //
      if (i === 0 && i < iLast) {
        // li begin
        if (
          prop[i].parent === prop[i + 1].parent
          &&
          prop[i].indentNum <= prop[i + 1].indentNum
        ) {
          liAccum = liAccum.concat([prop[i].parent])
          return `<${prop[i].parent}>${liFront(prop, i)}${work[i].replace(re_list, ``)}</li>`
        }
        // li begin & end
        if (
          prop[i].parent !== prop[i + 1].parent
          ||
          prop[i].indentNum > prop[i + 1].indentNum
        ) {
          liAccum = liAccum.concat([prop[i].parent])
          return `<${prop[i].parent}>${liFront(prop, i)}${work[i].replace(re_list, ``)}</li>${liEnd(prop, i)}`
        }
      }
      //
      // now last line, not 1st line
      //
      if (i > 0 && i === iLast) {
        // li end
        if (
          prop[i].parent === prop[i - 1].parent
          &&
          prop[i].indentNum <= prop[i - 1].indentNum
        ) {
          return `${liFront(prop, i)}${work[i].replace(re_list, ``)}</li>${liEnd(prop, i)}`
        }
        // li begin & end
        if (
          prop[i].parent !== prop[i - 1].parent
          ||
          prop[i].indentNum > prop[i - 1].indentNum
        ) {
          liAccum = liAccum.concat([prop[i].parent])
          return `<${prop[i].parent}>${liFront(prop, i)}${work[i].replace(re_list, ``)}</li>${liEnd(prop, i)}`
        }
      }
      //
      // only one line exists
      //
      if (iLast === 0) {
        // li begin & end
        liAccum = liAccum.concat([prop[i].parent])
        return `<${prop[i].parent}>${liFront(prop, i)}${work[i].replace(re_list, ``)}</li>${liEnd(prop, i)}`
      }
      //
      //
      // liEnd
      //
      //
      function liEnd(prop, i) {
        let underground = 0
        if (
          i < iLast
        ) {
          if ( // all end
            prop[i + 1].class !== `list`
            ||
            (
              prop[i].parent !== prop[i + 1].parent
              &&
              prop[i].indentNum === 0
              &&
              prop[i + 1].indentNum === 0
            )
          ) {
            underground = 1
          }
          let diff = prop[i].indentNum - prop[i + 1].indentNum + underground
          let liTerminator = liAccum.slice(-diff)
          liAccum.splice(-1, diff)
          if (liTerminator instanceof Array || typeof liTerminator === `array`) {
            liTerminator = liTerminator.reverse().join(`></`)
          }
          return `</${liTerminator}>`
        }
        else {
          underground = 1
          let liTerminator = liAccum.pop(prop[i].indentNum +/*prop[i+1].indentNum*/+ underground)
          if (liTerminator instanceof Array || typeof liTerminator === `array`) {
            liTerminator = liTerminator.reverse().join(`></`)
          }
          return `</${liTerminator}>`
        }
      }
      //
      //
      // liFront
      //
      //
      function liFront(prop, i) {
        let re_listTlStill = new RegExp(`^[ \\t]*[*+\\-] \\[ ?\\]`)
        let re_listTlAlready = new RegExp(`^[ \\t]*[*+\\-] \\[[xX]\\]`)
        if (!prop[i].task) {
          return `<li>`
        }
        if (re_listTlStill.test(work[i])) {
          return `<li><input type="checkbox">`
        }
        if (re_listTlAlready.test(work[i])) {
          return `<li><input type="checkbox" checked>`
        }
      }
    }
    /* block-level content / blockquote
    ######     ##          ######      ######    ##   ##     ######     ##    ##     ######     ########    ####### 
    ##   ##    ##         ##    ##    ##         ##  ##     ##    ##    ##    ##    ##    ##       ##       ##      
    ######     ##         ##    ##    ##         #####      ##    ##    ##    ##    ##    ##       ##       #####   
    ##   ##    ##         ##    ##    ##         ##  ##     ## ## ##    ##    ##    ##    ##       ##       ##      
    ######     #######     ######      ######    ##   ##     ######      ######      ######        ##       ####### 
                                                                ##                                                  
    */
    function blockquote(prop, i) {
      /*
        table of if
        blockquote...
        1. continue
        2. begin, not end
        3. end, not begin
        4. begin and end
      */
      //
      // now not 1st & last line
      //
      if (i > 0 && i < iLast) {
        // 1. continue
        if (
          prop[i].bqStack <= prop[i - 1].bqStack
          &&
          prop[i].bqStack <= prop[i + 1].bqStack
        ) {
          return `<br>${work[i].replace(/^>+ /, ``)}`
        }
        // 2. begin, not end
        if (
          prop[i].bqStack > (prop[i - 1].bqStack || 0)
          &&
          prop[i].bqStack <= prop[i + 1].bqStack
        ) {
          return `${`<blockquote>`.repeat(prop[i].bqStack - (prop[i - 1].bqStack || 0))}${work[i].replace(/^>+ /, ``)}`
        }
        // 3. end, not begin
        if (
          prop[i].bqStack <= prop[i - 1].bqStack
          &&
          prop[i].bqStack > (prop[i + 1].bqStack || 0)
        ) {
          return `${work[i].replace(/^>+ /, ``)}${`</blockquote>`.repeat(prop[i].bqStack - (prop[i + 1].bqStack || 0))}`
        }
        // 4. begin and end
        if (
          prop[i].bqStack > (prop[i - 1].bqStack || 0)
          &&
          prop[i].bqStack > (prop[i + 1].bqStack || 0)
        ) {
          return `${`<blockquote>`.repeat(prop[i].bqStack - (prop[i - 1].bqStack || 0))}${work[i].replace(/^>+ /, ``)}${`</blockquote>`.repeat(prop[i].bqStack - (prop[i + 1].bqStack || 0))}`
        }
      }
      //
      // now 1st line, not last line
      //
      if (i === 0 && i < iLast) {
        // 2. begin, not end
        if (
          prop[i].bqStack <= prop[i + 1].bqStack
        ) {
          return `${`<blockquote>`.repeat(prop[i].bqStack)}${work[i].replace(/^>+ /, ``)}`
        }
        // 4. begin and end
        if (
          prop[i].bqStack > (prop[i + 1].bqStack || 0)
        ) {
          return `${`<blockquote>`.repeat(prop[i].bqStack)}${work[i].replace(/^>+ /, ``)}${`</blockquote>`.repeat(prop[i].bqStack - (prop[i + 1].bqStack || 0))}`
        }
      }
      //
      // now last line, not 1st line
      //
      if (i > 0 && i === iLast) {
        // 3. end, not begin
        if (
          prop[i].bqStack <= prop[i - 1].bqStack
        ) {
          return `${work[i].replace(/^>+ /, ``)}${`</blockquote>`.repeat(prop[i].bqStack)}`
        }
        // 4. begin and end
        if (
          prop[i].bqStack > (prop[i - 1].bqStack || 0)
        ) {
          return `${`<blockquote>`.repeat(prop[i].bqStack - (prop[i - 1].bqStack || 0))}${work[i].replace(/^>+ /, ``)}${`</blockquote>`.repeat(prop[i].bqStack)}`
        }
      }
      //
      // only one line exists
      //
      if (0 === iLast) {
        return `${`<blockquote>`.repeat(prop[i].bqStack)}${work[i].replace(/^>+ /, ``)}${`</blockquote>`.repeat(prop[i].bqStack)}`
      }
    }
  }
  /* inline-level content
  ####    ##    ##    ##          ####    ##    ##    ########               ##          ########    ##     ##    ########    ##                 ######      #######     ##    ##    ########    ########    ##    ##    ######## 
   ##     ###   ##    ##           ##     ###   ##    ##                     ##          ##          ##     ##    ##          ##                ##    ##    ##     ##    ###   ##       ##       ##          ###   ##       ##    
   ##     ####  ##    ##           ##     ####  ##    ##                     ##          ##          ##     ##    ##          ##                ##          ##     ##    ####  ##       ##       ##          ####  ##       ##    
   ##     ## ## ##    ##           ##     ## ## ##    ######      #######    ##          ######      ##     ##    ######      ##                ##          ##     ##    ## ## ##       ##       ######      ## ## ##       ##    
   ##     ##  ####    ##           ##     ##  ####    ##                     ##          ##           ##   ##     ##          ##                ##          ##     ##    ##  ####       ##       ##          ##  ####       ##    
   ##     ##   ###    ##           ##     ##   ###    ##                     ##          ##            ## ##      ##          ##                ##    ##    ##     ##    ##   ###       ##       ##          ##   ###       ##    
  ####    ##    ##    ########    ####    ##    ##    ########               ########    ########       ###       ########    ########           ######      #######     ##    ##       ##       ########    ##    ##       ##    
  */
  function markupInline(rly) {
    work = work.filter(rly => rly.length !== 0)
    let fKey = []
    let fKeyNum = 0
    let fKeyDsp = {}
    let fKeyDspIncr = 1
    let fRtn = {}
    let re_fKey = /(?<!\\(?:\\\\)*|!)(?<=\[\^).+?(?=\](?!:))/g
    for (let i in work) {
      work[i] = work[i]
      .replace(/(?<= |^|>|_|\*|~)(?:\\\\)*__(.+?)(?<!\\(?:\\\\)*)__(?= |$|<|_|\*|~)/g, `<strong>$1</strong>`)
      .replace(/(?<= |^|>|_|\*|~)(?:\\\\)*_(.+?)(?<!\\(?:\\\\)*)_(?= |$|<|_|\*|~)/g, `<em>$1</em>`)
      .replace(/(?<= |^|>|_|\*|~)(?:\\\\)*\*\*(.+?)(?<!\\(?:\\\\)*)\*\*(?= |$|<|_|\*|~)/g, `<strong>$1</strong>`)
      .replace(/(?<= |^|>|_|\*|~)(?:\\\\)*\*(.+?)(?<!\\(?:\\\\)*)\*(?= |$|<|_|\*|~)/g, `<em>$1</em>`)
      .replace(/(?<= |^|>|_|\*|~)(?:\\\\)*~~(.+?)(?<!\\(?:\\\\)*)~~(?= |$|<|_|\*|~)/g, `<del>$1</del>`)
      .replace(/(?<= |^|>|_|\*|~)(?:\\\\)*!\[(.+?)(?<!\\(?:\\\\)*)\]\((.+?)\)(?= |$|<|_|\*|~)/g, (match, grp1, grp2) => `<img src="${grp2}" alt="${grp1}">`)
      .replace(/(?<= |^|>|_|\*|~)(?:\\\\)*(?<!!)\[(.+?)(?<!\\(?:\\\\)*)\]\((.+?)\)(?= |$|<|_|\*|~)/g, (match, grp1, grp2) => `<a href="${grp2}">${grp1}</a>`)
      if (re_fKey.test(work[i])) {
        let workL = work[i].match(re_fKey)
        for (let j in workL) {
          fKey = fKey.concat([workL[j]])
          if (!fRtn[workL[j]]) {
            fRtn[workL[j]] = [fKeyNum]
          }
          else {
            fRtn[workL[j]] = fRtn[workL[j]].concat([fKeyNum])
          }
          if (Object.keys(fKeyDsp).indexOf(fKey[fKeyNum]) < 0) {
            fKeyDsp[fKey[fKeyNum]] = fKeyDspIncr
            fKeyDspIncr++
          }
          let re_fKeyRpl = new RegExp(`(?<!\\\\(?:\\\\\\\\)*|!)\\[\\^${fKey[fKeyNum]}\\](?!:)`)
          work[i] = work[i].replace(re_fKeyRpl, `<sup>[<a href="#user-content-${fKey[fKeyNum]}" name="user-content-return-${fKeyNum}">${fKeyDsp[fKey[fKeyNum]]}</a>]</sup>`)
          fKeyNum++
        }
      }
    }
    return [fKey, fRtn, fKeyDsp, rly[1], rly[2]]
  }
  /* footnote
  ########     #######      #######     ########    ##    ##     #######     ########    ######## 
  ##          ##     ##    ##     ##       ##       ###   ##    ##     ##       ##       ##       
  ##          ##     ##    ##     ##       ##       ####  ##    ##     ##       ##       ##       
  ######      ##     ##    ##     ##       ##       ## ## ##    ##     ##       ##       ######   
  ##          ##     ##    ##     ##       ##       ##  ####    ##     ##       ##       ##       
  ##          ##     ##    ##     ##       ##       ##   ###    ##     ##       ##       ##       
  ##           #######      #######        ##       ##    ##     #######        ##       ######## 
  */
  function footnote(rly) {
    let fKey = Array.from(new Set(rly[0]))
    let fRtn = rly[1]
    let fKeyDsp = rly[2]
    let fContentKey = rly[3]
    let fContentWord = rly[4]
    let fContent = `<section><ul>`
    let fContentKeyRest = fContentKey.slice()
    let fContentKeySort = []
    let fContentWordRest = fContentWord.slice()
    let fContentWordSort = []
    for (let i in fKey) {
      for (let j in fContentKey) {
        if (fKey[i] === fContentKey[j]) {
          fContentKeySort = fContentKeySort.concat([fContentKey[j]])
          fContentKeyRest.splice(fContentKeyRest.indexOf(fContentKey[j]), 1)
          fContentWordSort = fContentWordSort.concat([fContentWord[j]])
          fContentWordRest.splice(fContentWordRest.indexOf(fContentWord[j]), 1)
        }
      }
    }
    for (let i in fContentKeySort) {
      for (let j in fKey) {
        let rtn = ``
        if (fContentKeySort[i] === fKey[j]) {
          for (let k in fRtn[fKey[j]]) {
            rtn += `<a href="#user-content-return-${fRtn[fKey[j]][k]}">${arrowIcon}</a> `
          }
          fContent += `<li><a name="user-content-${fKey[j]}">${fKeyDsp[fKey[j]]}</a>. ${fContentWordSort[i]} ${rtn}</li>`
        }
      }
    }
    for (let i in fContentKeyRest) {
      fContent += `<li>${fContentWordRest[i]}</li>`
    }
    fContent += `<ul></section>`
    return work.join(`\n`).replace(/\\+/g, match => `\\`.repeat(Math.floor(match.length / 2))) + fContent
  }
}
