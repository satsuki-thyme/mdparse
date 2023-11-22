function mdparse(src, parseType) {
  let work = src
  .replace(/  (\r?\n|$)/g, `<br>`)
  .split(/\r?\n/)
  let iLast = work.length - 1
  let indentSet = `( {2}|\\t)`
  let re_indent = null
  let liContinuation = false
  let liAccum = []
  let preEncContinuation = false
  let arrowIcon = // for footnote
  `<svg class="user-cnt-arrow" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0, 0, 16, 21"><path d="M 0,0 V 2 h 8 c 3,0 6,3 6,6 0,3 -3,6 -6,6 H 7 v 2 h 1 c 4,0 8,-4 8,-8 0,-4 -4,-8 -8,-8 z"/><path d="M 6,21 7,19 3,15 7,11 6,9 0,15 Z"/></svg>`
  let re_blank = new RegExp(`^[ \\t]*$`)
  let re_h = new RegExp(`^#{1,6} `)
  let re_liBegin = new RegExp(`^([*+\\-] |\\d+\\. )(?!.*([*\\-_][ \\t]*){2,}).*$`)
  let re_li = new RegExp(`^[ \\t]*([*+\\-] |\\d+\\. )(\\[[ xX]\\])?`)
  let re_liUl = new RegExp(`^[ \\t]*[*+\\-] `)
  let re_liTl = new RegExp(`^[ \\t]*[*+\\-] \\[[ xX]\\]`)
  let re_liOl = new RegExp(`^[ \\t]*\\d+\\. `)
  let re_bq = new RegExp(`^>+`)
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
    let rowNumAttach = 0
    let i = 0
    return new Promise(resolve => {
      fn()
      function fn() {
        prop[i] = {}
        prop[i].indentVal = (work[i].match(/^[ \t]*/) || [])[0].length
        /*
          table of if
          1. blank
          2. h
          3. p
          4. li with ul as parent
          5. li with ol as parent
          6. blockquote
          7. pre with enclosing begin or end
          8. pre with enclosing continues
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
          re_h.test(work[i])
        ) {
          prop[i].class = `h`
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
          !re_h.test(work[i])
          &&
          !re_li.test(work[i])
          &&
          !re_bq.test(work[i])
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
          prop[i].class = `p`
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
          re_liBegin.test(work[i])
        ) {
          prop[i].class = `li`
          if (re_liUl.test(work[i])) {
            prop[i].parent = `ul`
          }
          if (re_liOl.test(work[i])) {
            prop[i].parent = `ol`
          }
          if (re_liTl.test(work[i])) {
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
          re_liUl.test(work[i])
        ) {
          prop[i].class = `li`
          prop[i].parent = `ul`
          if (!re_li.test(work[i + 1])) {
            liContinuation = false
          }
          if (re_liTl.test(work[i])) {
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
          re_liOl.test(work[i])
        ) {
          prop[i].class = `li`
          prop[i].parent = `ol`
          if (!re_li.test(work[i + 1])) {
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
          re_bq.test(work[i])
        ) {
          prop[i].class = `bq`
          prop[i].stack = work[i].match(/^>+/)[0].length
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
          // continue
          if (prop[i - 1].class === `table` && re_table.test(work[i + 1])) {
            prop[i].site = `middle`
            prop[i].tGrp = prop[i - 1].tGrp
            procHLine()
          }
          // begin
          if (prop[i - 1].class !== `table` && re_table.test(work[i + 1])) {
            prop[i].site = `begin`
            prop[i].tGrp = i
            procHLine()
          }
          // end
          if (prop[i - 1].class === `table` && !re_table.test(work[i + 1])) {
            prop[i].site = `end`
            prop[i].tGrp = prop[i - 1].tGrp
            procHLine()
          }
          // begin & end
          if (prop[i - 1].class !== `table` && !re_table.test(work[i + 1])) {
            prop[i].site = `az`
            prop[i].tGrp = i
            procHLine()
          }
          // inherit to begining with horizontal line
          if (prop[i - 1].hLine === `current` && prop[i - 1].beginWithHLine) {
            prop[i].beginWithHLine = true
          }
          function procHLine() {
            if (prop[i - 1].hLine === `current` || prop[i - 1].hLine === `after`) {
              prop[i].hLine = `after`
            }
            else {
              prop[i].hLine = `unrelated`
            }
          }
          if (/^\|([ :]?-+[ :]?\|)+/.test(work[i])) {
            prop[i].hLine = `current`
            fn1(prop[i].tGrp, i)
            function fn1(tGrp, iL) {
              iL--
              if (prop[iL].tGrp === tGrp) {
                prop[iL].hLine = `before`
                fn1(tGrp, iL)
              }
              if (prop[iL].tGrp !== tGrp && iL === i - 1) {
                prop[i].beginWithHLine = true
              }
            }
          }
          if (i < iLast) {
            i++
            fn()
          }
          else {
            resolve(prop)
          }
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
          prop[i].class = `hr`
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
    isArray = Array.from(new Set(isArray)).sort((a, b) => {return a - b})
    itArray = Array.from(new Set(itArray)).sort((a, b) => {return a - b})
    let isDiff = isArray.reduce((a, b) => {return (a[0].push(b - a[1]), a[1] = b, a)}, [[], 0]).shift()
    let itDiff = itArray.reduce((a, b) => {return (a[0].push(b - a[1]), a[1] = b, a)}, [[], 0]).shift()
    let c = (a, i, b) => (a[i] ? a[i].add(b) : a[i] = new Set(b), i)
    let isNum = Math.min([...isDiff.reduce(function(a, b) {return (b = String(b), this.set(b, c(a, (this.get(b) + 1 || 1), b)), a)}.bind(new Map), []).pop()].map(rly => Number(rly)))
    let itNum = Math.min([...itDiff.reduce(function(a, b) {return (b = String(b), this.set(b, c(a, (this.get(b) + 1 || 1), b)), a)}.bind(new Map), []).pop()].map(rly => Number(rly)))
    for (let i in prop) {
      let indentBlob = (work[i].match(/^[ \t]*/) || [``])[0]
      prop[i].indentNum = Math.ceil(isNum !==0 ? (indentBlob.match(/ /g) || []).length / isNum : 0) + Math.ceil(itNum !== 0 ? (indentBlob.match(/\t/g) || []).length / itNum : 0)
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
  /* block element
  ########     ##           #######      ######     ##    ##          ########    ##          ########    ##     ##    ########    ##    ##    ######## 
  ##     ##    ##          ##     ##    ##    ##    ##   ##           ##          ##          ##          ###   ###    ##          ###   ##       ##    
  ##     ##    ##          ##     ##    ##          ##  ##            ##          ##          ##          #### ####    ##          ####  ##       ##    
  ########     ##          ##     ##    ##          #####             ######      ##          ######      ## ### ##    ######      ## ## ##       ##    
  ##     ##    ##          ##     ##    ##          ##  ##            ##          ##          ##          ##     ##    ##          ##  ####       ##    
  ##     ##    ##          ##     ##    ##    ##    ##   ##           ##          ##          ##          ##     ##    ##          ##   ###       ##    
  ########     ########     #######      ######     ##    ##          ########    ########    ########    ##     ##    ########    ##    ##       ##    
  */
  function markupBlock(prop) {
    let i = 0
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
          /* block element / blank
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
          /* block element / heading
          ##   ##    #######     #####     ######     ##    ###    ##     ######  
          ##   ##    ##         ##   ##    ##   ##    ##    ####   ##    ##       
          #######    #####      #######    ##   ##    ##    ## ##  ##    ##   ### 
          ##   ##    ##         ##   ##    ##   ##    ##    ##  ## ##    ##    ## 
          ##   ##    #######    ##   ##    ######     ##    ##   ####     ######  
          */
          case `h`:
            work[i] = h(work, i)
            if (i < iLast) {
              i++
              fn()
            }
            else {
              resolve(prop)
            }
            break
          /* block element / paragraph
          ######      #####     ######      #####      ######     ######      #####     ######     ##   ## 
          ##   ##    ##   ##    ##   ##    ##   ##    ##          ##   ##    ##   ##    ##   ##    ##   ## 
          ######     #######    ######     #######    ##   ###    ######     #######    ######     ####### 
          ##         ##   ##    ##   ##    ##   ##    ##    ##    ##   ##    ##   ##    ##         ##   ## 
          ##         ##   ##    ##   ##    ##   ##     ######     ##   ##    ##   ##    ##         ##   ## 
          */
          case `p`:
            if (
              i === iLast
              ||
              prop[i + 1].class !== `p`
              ||
              parseType === `permissive`
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
              work[i + 1] = `${work[i]}${pConcat(work[i])}${work[i + 1]}`
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
          /* block element / list
          ##         ##    #######    ######## 
          ##         ##    ##            ##    
          ##         ##    #######       ##    
          ##         ##         ##       ##    
          #######    ##    #######       ##    
          */
          case `li`:
            work[i] = li(prop, i)
            if (i < iLast) {
              i++
              fn()
            }
            else {
              resolve(prop)
            }
            break
          /* block element / blockquote
          ######     ##          ######      ######    ##   ##     ######     ##    ##     ######     ########    ####### 
          ##   ##    ##         ##    ##    ##         ##  ##     ##    ##    ##    ##    ##    ##       ##       ##      
          ######     ##         ##    ##    ##         #####      ##    ##    ##    ##    ##    ##       ##       #####   
          ##   ##    ##         ##    ##    ##         ##  ##     ## ## ##    ##    ##    ##    ##       ##       ##      
          ######     #######     ######      ######    ##   ##     ######      ######      ######        ##       ####### 
                                                                      ##                                                  
          */
          case `bq`:
            work[i] = bq(prop, i)
            if (i < iLast) {
              i++
              fn()
            }
            else {
              resolve(prop)
            }
            break
            /* block element / pre enclosing
            ######     ######     #######            #######    ###    ##     ###### 
            ##   ##    ##   ##    ##                 ##         ####   ##    ##      
            ######     ######     #####              #####      ## ##  ##    ##      
            ##         ##   ##    ##                 ##         ##  ## ##    ##      
            ##         ##   ##    #######            #######    ##   ####     ###### 
            */          case `preEnc`:
            if (prop[i].site === `middle` && prop[i + 1].site !== `end`) {
              work[i] = `\n${work[i]}`
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
              work[i] = prop[i].lang !== `` ? `\n<pre><code class="language-${prop[i].lang}">${work[i]}` : `\n<pre><code>${work[i]}`
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
              work[i] = `\n${work[i]}</code></pre>`
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
              work[i] = prop[i].lang !== `` ? `\n<pre><code class="language-${prop[i].lang}"><br></code></pre>` : `\n<pre><code><br></code></pre>`
              if (i < iLast) {
                fn()
              }
              else {
                resolve(prop)
              }
            }
            break
          /* block element / pre indentation
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
              1. continues
              2. begin, not end
              3. end, not begin
              4. begin, not end
            */
            // pre continues
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
          /* block element / table
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
              let cellFront = ``
              let cellBack = ``
              //
              // continue
              //
              if (prop[i].site === `middle` && prop[i].hLine !== `current`) {
                // continue before horizontal line
                if (prop[i].hLine === `before`) {
                  cellFront = `\n<th>`
                  cellBack = `</th>`
                }
                // continue after horizontal line
                if (prop[i].hLine === `after` || prop[i].hLine === `unrelated`) {
                  cellFront = `\n<td>`
                  cellBack = `</td>`
                }
                // begin with horizontal line
                if (prop[i].beginWithHLine) {
                  rowFront = `\n<table>\n<tbody>`
                  cellFront = `\n<td>`
                  cellBack = `</td>`
                }
                // end with horizontal line
                if (prop[i].hLine === `before` && prop[i + 1].hLine === `current` && prop[i + 1].site === `end`) {
                  rowBack = `\n</tbody>\n</table>`
                  cellFront = `\n<th>`
                  cellBack = `</th>`
                }
              }
              //
              // begin
              //
              if (prop[i].site === `begin`) {
                // begin before horizontal line
                if (prop[i].hLine === `before` && prop[i + 1].hLine !== `current`) {
                  rowFront = `\n<table>\n<thead>`
                  cellFront = `\n<th>`
                  cellBack = `</th>`
                }
                // begin just before horizontal line
                if (prop[i].hLine === `before` && prop[i + 1].hLine === `current`) {
                  rowFront = `\n<table>\n<thead>`
                  rowBack = `\n</thead>`
                  cellFront = `\n<th>`
                  cellBack = `</th>`
                }
                // begin unrelated to horizotal line
                if (prop[i].hLine === `unrelated`) {
                  rowFront = `\n<table>\n<tbody>`
                  cellFront = `\n<td>`
                  cellBack = `</td>`
                }
                // begin just before horizotal line ending
                if (prop[i].hLine === `before` && prop[i + 1].hLine === `current` && prop[i + 1].site === `end`) {
                  rowFront = `\n<table>\n<thead>`
                  rowBack = `\n</thead>\n</table>`
                  cellFront = `\n<td>`
                  cellBack = `</td>`
                }
              }
              //
              // end
              //
              if (prop[i].site === `end`) {
                // end standard
                if (prop[i].hLine === `after` && prop[i - 1].hLine === `after`) {
                  rowBack = `\n</tbody>\n</table>`
                  cellFront = `\n<td>`
                  cellBack = `</td>`
                }
                // end just after horizontal line
                if (prop[i].hLine === `after` && prop[i - 1].hLine === `before`) {
                  rowFront = `\n<tbody>`
                  rowBack = `\n</tbody>\n</table>`
                  cellFront = `\n<td>`
                  cellBack = `</td>`
                }
                // end just after horizontal line begining
                if (prop[i].beginWithHLine) {
                  rowFront = `\n<table>\n<tbody>`
                  rowBack = `\n</tbody>\n</table>`
                  cellFront = `\n<td>`
                  cellBack = `</td>`
                }
                // end unrelated to horizotal line
                if (prop[i].hLine === `unrelated`) {
                  rowBack = `\n</tbody>\n</table>`
                  cellFront = `\n<td>`
                  cellBack = `</td>`
                }
              }
              //
              // begin & end
              //
              if (prop[i].site === `az`) {
                rowFront = `\n<table>\n<tbody>`
                rowBack = `\n</tbody>\n</table>`
                cellFront = `\n<td>`
                cellBack = `</td>`
              }
              //
              // execute replace
              //
              work[i] = work[i]
              .replace(/^\|/, ``)
              .replace(/[ \t]*(.*?)[ \t]*(?<!\\(\\\\)*)(?<!\\)\|/g, `${cellFront}$1${cellBack}`)
              .replace(/^/, `${rowFront}\n<tr>`)
              .replace(/$/, `\n</tr>${rowBack}`)
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
          /* block element / footnote
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
          /* block element / horizontal ruler
          ##   ##     ######     ######     ##    #######     ######     ###    ##    ########     #####     ##                 ######     ##    ##    ##         #######    ######  
          ##   ##    ##    ##    ##   ##    ##       ###     ##    ##    ####   ##       ##       ##   ##    ##                 ##   ##    ##    ##    ##         ##         ##   ## 
          #######    ##    ##    ######     ##      ###      ##    ##    ## ##  ##       ##       #######    ##                 ######     ##    ##    ##         #####      ######  
          ##   ##    ##    ##    ##   ##    ##     ###       ##    ##    ##  ## ##       ##       ##   ##    ##                 ##   ##    ##    ##    ##         ##         ##   ## 
          ##   ##     ######     ##   ##    ##    #######     ######     ##   ####       ##       ##   ##    #######            ##   ##     ######     #######    #######    ##   ## 
          */
          case `hr`:
            work[i] = `<hr>`
            if (i < iLast) {
              i++
              fn()
            }
            else {
              resolve(prop)
            }
            break
          /* block element / unmatched
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
          /* block element / default case
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
          // made by "switch". this step was made by "switch"
        }
      }
    }), fContentKey, fContentWord]
  }
  /* inline element
  ####    ##    ##    ##          ####    ##    ##    ########          ########    ##          ########    ##     ##    ########    ##    ##    ######## 
   ##     ###   ##    ##           ##     ###   ##    ##                ##          ##          ##          ###   ###    ##          ###   ##       ##    
   ##     ####  ##    ##           ##     ####  ##    ##                ##          ##          ##          #### ####    ##          ####  ##       ##    
   ##     ## ## ##    ##           ##     ## ## ##    ######            ######      ##          ######      ## ### ##    ######      ## ## ##       ##    
   ##     ##  ####    ##           ##     ##  ####    ##                ##          ##          ##          ##     ##    ##          ##  ####       ##    
   ##     ##   ###    ##           ##     ##   ###    ##                ##          ##          ##          ##     ##    ##          ##   ###       ##    
  ####    ##    ##    ########    ####    ##    ##    ########          ########    ########    ########    ##     ##    ########    ##    ##       ##    
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
      .replace(/(?!\\(?:\\\\)*|_)_(?!_)(.+?)(?<!_|\\(?:\\\\)*)_(?!_)/g, `<em>$1</em>`)
      .replace(/(?!\\(?:\\\\)*|_)__(?!_)(.+?)(?<!_|\\(?:\\\\)*)__(?!_)/g, `<strong>$1</strong>`)
      .replace(/(?!\\(?:\\\\)*)___(.+?)(?<!\\(?:\\\\)*)___/g, `<strong><em>$1</em></strong>`)
      .replace(/(?!\\(?:\\\\)*|\*)\*(?!\*)(.+?)(?<!\*|\\(?:\\\\)*)\*(?!\*)/g, `<em>$1</em>`)
      .replace(/(?!\\(?:\\\\)*|\*)\*\*(?!\*)(.+?)(?<!\*|\\(?:\\\\)*)\*\*(?!\*)/g, `<strong>$1</strong>`)
      .replace(/(?!\\(?:\\\\)*)\*\*\*(.+?)(?<!\\(?:\\\\)*)\*\*\*/g, `<strong><em>$1</em></strong>`)
      .replace(/(?!\\(?:\\\\)*|~)~~(?!~)(.+?)(?<!\\(?:\\\\)*)~~(?!~)/g, `<del>$1</del>`)
      .replace(/(?!\\(?:\\\\)*|!)\[(.+?)(?<!\\(?:\\\\)*)\]\((.+?)\)/g, `<a href="$2">$1</a>`)
      .replace(/(?!\\(?:\\\\)*)!\[(.+?)(?<!\\(?:\\\\)*)\]\((.+?)\)/g, `<img src="$2" alt="$1">`)
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
    let fContent = `\n<sectioin>\n<ul>`
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
          fContent += `\n<li><a name="user-content-${fKey[j]}">${fKeyDsp[fKey[j]]}</a>. ${fContentWordSort[i]} ${rtn}</li>`
        }
      }
    }
    for (let i in fContentKeyRest) {
      fContent += `\n<li>${fContentWordRest[i]}</li>`
    }
    fContent += `\n<ul>\n</section>`
    return work.join(`\n`) + fContent
  }
  /* other function
   #######     ########    ##     ##    ########    ########           ########    ##     ##    ##    ##     ######     ########    ####     #######     ##    ## 
  ##     ##       ##       ##     ##    ##          ##     ##          ##          ##     ##    ###   ##    ##    ##       ##        ##     ##     ##    ###   ## 
  ##     ##       ##       ##     ##    ##          ##     ##          ##          ##     ##    ####  ##    ##             ##        ##     ##     ##    ####  ## 
  ##     ##       ##       #########    ######      ########           ######      ##     ##    ## ## ##    ##             ##        ##     ##     ##    ## ## ## 
  ##     ##       ##       ##     ##    ##          ##   ##            ##          ##     ##    ##  ####    ##             ##        ##     ##     ##    ##  #### 
  ##     ##       ##       ##     ##    ##          ##    ##           ##          ##     ##    ##   ###    ##    ##       ##        ##     ##     ##    ##   ### 
   #######        ##       ##     ##    ########    ##     ##          ##           #######     ##    ##     ######        ##       ####     #######     ##    ## 
  */
  /* h
  ##   ## 
  ##   ## 
  ####### 
  ##   ## 
  ##   ## 
  */
  function h(work, i) {
    let num = work[i].match(/^#+/)[0].match(/#/g).length
    return `<h${num}>${work[i].replace(/^#+ /, ``)}</h${num}>`
  }
  /* pconcat
  ######      ######     ######     ###    ##     ######     #####     ######## 
  ##   ##    ##         ##    ##    ####   ##    ##         ##   ##       ##    
  ######     ##         ##    ##    ## ##  ##    ##         #######       ##    
  ##         ##         ##    ##    ##  ## ##    ##         ##   ##       ##    
  ##          ######     ######     ##   ####     ######    ##   ##       ##    
  */
  function pConcat(src) {
    if (/<br>$/.test(src) === false) {
      return ` `
    }
    else {
      return ``
    }
  }
  /* li
  ##         ## 
  ##         ## 
  ##         ## 
  ##         ## 
  #######    ## 
  */
  function li(prop, i) {
    //
    // now not 1st & last line
    //
    if (i > 0 && i < iLast) {
      // li continues
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
        return `${liFront(prop, i)}${work[i].replace(re_li, ``)}</li>`
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
        return `<${prop[i].parent}>${liFront(prop, i)}${work[i].replace(re_li, ``)}</li>`
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
        return `${liFront(prop, i)}${work[i].replace(re_li, ``)}</li>${liEnd(prop, i)}`
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
        return `<${prop[i].parent}>${liFront(prop, i)}${work[i].replace(re_li, ``)}</li>${liEnd(prop, i)}`
      }
    }
    //
    // now 1st line
    //
    if (i === 0 && i < iLast) {
      // li begin
      if (
        prop[i].parent === prop[i + 1].parent
        &&
        prop[i].indentNum <= prop[i + 1].indentNum
      ) {
        liAccum = liAccum.concat([prop[i].parent])
        return `<${prop[i].parent}>${liFront(prop, i)}${work[i].replace(re_li, ``)}</li>`
      }
      // li begin & end
      if (
        prop[i].parent !== prop[i + 1].parent
        ||
        prop[i].indentNum > prop[i + 1].indentNum
      ) {
        liAccum = liAccum.concat([prop[i].parent])
        return `<${prop[i].parent}>${liFront(prop, i)}${work[i].replace(re_li, ``)}</li>${liEnd(prop, i)}`
      }
    }
    //
    // now last line
    //
    if (i > 0 && i === iLast) {
      // li end
      if (
        prop[i].parent === prop[i - 1].parent
        &&
        prop[i].indentNum <= prop[i - 1].indentNum
      ) {
        return `${liFront(prop, i)}${work[i].replace(re_li, ``)}</li>${liEnd(prop, i)}`
      }
      // li begin & end
      if (
        prop[i].parent !== prop[i - 1].parent
        ||
        prop[i].indentNum > prop[i - 1].indentNum
      ) {
        liAccum = liAccum.concat([prop[i].parent])
        return `<${prop[i].parent}>${liFront(prop, i)}${work[i].replace(re_li, ``)}</li>${liEnd(prop, i)}`
      }
    }
    //
    // only one line exists
    //
    if (iLast === 0) {
      // li begin & end
      liAccum = liAccum.concat([prop[i].parent])
      return `<${prop[i].parent}>${liFront(prop, i)}${work[i].replace(re_li, ``)}</li>${liEnd(prop, i)}`
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
          prop[i + 1].class !== `li`
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
      let re_liTlStill = new RegExp(`^[ \\t]*[*+\\-] \\[ ?\\]`)
      let re_liTlAlready = new RegExp(`^[ \\t]*[*+\\-] \\[[xX]\\]`)
      if (!prop[i].task) {
        return `<li>`
      }
      if (re_liTlStill.test(work[i])) {
        return `<li><input type="checkbox">`
      }
      if (re_liTlAlready.test(work[i])) {
        return `<li><input type="checkbox" checked>`
      }
    }
  }
  /* bq
  ######      ######  
  ##   ##    ##    ## 
  ######     ##    ## 
  ##   ##    ## ## ## 
  ######      ######  
                  ##   
  */
  function bq(prop, i) {
    /*
      table of if
      blockquote...
      1. continues
      2. begin, not end
      3. end, not begin
      4. begin and end
    */
    // blockquote continues
    if (
      prop[i].stack <= prop[i - 1].stack
      &&
      prop[i].stack <= prop[i + 1].stack
    ) {
      return work[i].replace(/^>+ ?/, ``)
    }
    // blockquote begin, not end
    else if (
      (
        prop[i - 1].class !== `bq`
        ||
        prop[i].stack > prop[i - 1].stack
      )
      &&
      prop[i + 1].class === `bq`
    ) {
      let bqBegin = ``
      if (prop[i - 1].class !== `bq`) {
        bqBegin = `${`<blockquote>`.repeat(prop[i].stack)}<p>`
      }
      else {
        bqBegin = `${`<blockquote>`.repeat(prop[i].stack - prop[i - 1].stack)}<p>`
      }
      return `${bqBegin}${work[i].replace(/^>+ ?/, ``)}`
    }
    // blockquote end, not begin
    else if (
      (
        prop[i + 1].class !== `bq`
        ||
        prop[i].stack > prop[i + 1].stack
      )
      &&
      prop[i - 1].class === `bq`
    ) {
      let bqEnd = ``
      if (prop[i + 1].class !== `bq`) {
        bqEnd = `${`</blockquote>`.repeat(prop[i].stack)}</p>`
      }
      else {
        bqEnd = `${`</blockquote>`.repeat(prop[i].stack - prop[i + 1].stack)}</p>`
      }
      return `${work[i].replace(/^>+ ?/, ``)}${bqEnd}`
    }
    // blockquote begin and end
    else if (
      (
        prop[i - 1].class !== `bq`
        ||
        prop[i].stack > prop[i - 1].stack
      )
      &&
      (
        prop[i + 1].class !== `bq`
        ||
        prop[i].stack > prop[i + 1].stack
      )
    ) {
      let bqBegin = ``
      let bqEnd = ``
      if (prop[i - 1].class !== `bq`) {
        bqBegin = `${`<blockquote>`.repeat(prop[i].stack)}<p>`
      }
      else {
        bqBegin = `${`<blockquote>`.repeat(prop[i].stack - prop[i - 1].stack)}<p>`
      }
      if (prop[i + 1].class !== `bq`) {
        bqEnd = `${`</blockquote>`.repeat(prop[i].stack)}</p>`
      }
      else {
        bqEnd = `${`</blockquote>`.repeat(prop[i].stack - prop[i + 1].stack)}</p>`
      }
      return `${bqBegin}${work[i].replace(/^>+ ?/, ``)}${bqEnd}`
    }
  }
}
