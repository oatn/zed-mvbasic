; MV BASIC (jBASE/T24) highlighting.
; Words all parse as `identifier`; keywords/intrinsics are recognised here so
; the grammar stays flat (same trick the VS Code tmLanguage grammar uses).
; Later patterns win, so keyword comes after function.

(comment) @comment
(inline_comment) @comment

(string) @string
(number) @number

((label) @label)
((system_variable) @variable.special)
((preprocessor) @preproc)

((operator) @operator)
["(" ")" "[" "]"] @punctuation.bracket

((identifier) @variable)

((identifier) @function
 (#match? @function "^(?i)(key|abs|abss|adds|alpha|ands|ascii|assigned|bitand|bitchange|bitcheck|bitload|bitnot|bitor|bitreset|bitset|bittest|bitxor|bytelen|callonexit|cats|change|char|chars|chdir|checksum|col1|col2|compare|convert|count|counts|date|dcount|decrypt|dir|div|divs|downcase|dquote|dround|dtx|ebcdic|encrypt|ereplace|exp|extract|eqs|fadd|fdiv|field|fields|fileinfo|filelock|fileunlock|fmt|fmts|fmul|fold|fsub|ges|getcwd|getenv|group|iconv|iconvs|ifs|index|indices|inmat|insert|int|ioctl|isalpha|isalnum|iscntrl|isdigit|islower|isprint|isspace|isupper|jbasecoredump|keyin|left|len|lens|lendp|les|ln|localdate|localtime|lowcase|lower|maketimestamp|maximum|match|matches|matchfield|minimum|mod|mods|msleep|muls|neg|negs|nes|not|nots|num|oconv|oconvs|ors|putenv|pwr|quote|raise|recordlocked|regexp|remove|replace|rem|right|rnd|reuse|sadd|sdiv|sentence|seq|seqs|sin|smul|sort|soundex|space|spaces|splice|sqrt|squote|ssub|status|str|strs|subr|subs|substrings|sum|summation|swap|system|time|timedate|timediff|timeout|timestamp|trans|trim|trimb|trimbs|trimf|trimfs|trims|unassigned|uniquekey|upcase|utf8|xtd)$"))

((identifier) @operator
 (#match? @operator "^(?i)(eq|ne|gt|lt|ge|le)$"))

((identifier) @keyword
 (#match? @keyword "^(?i)(abort|and|begin|break|bscan|by|call|calling|capturing|case|chain|change|clear|clearcommon|cleardata|clearfile|clearinput|clearselect|close|closeseq|com|common|continue|convert|create|crt|data|debug|defc|defce|deffun|del|delete|deletelist|deleteseq|deleteu|dim|dimension|display|do|echo|else|end|equ|equate|error|execute|exit|filelock|fileunlock|find|findstr|footing|for|formlist|from|function|get|getlist|go|gosub|goto|groupstore|heading|headinge|headingn|hush|if|include|input|inputclear|inputnull|ins|itype|locate|lock|locked|loop|mat|matbuild|matparse|matread|matreadu|matwrite|matwriteu|next|nobuf|null|off|on|open|opendev|openindex|openpath|openseq|openser|or|osbread|osbwrite|osclose|osdelete|osopen|osread|oswrite|out|page|passlist|pause|perform|precision|print|printer|printerr|procread|procwrite|program|prompt|read|readblk|readlist|readnext|readprev|readseq|readt|readu|readv|readvu|readxml|release|remove|repeat|reset|return|returning|rewind|rqm|rtndata|rtnlist|seek|select|selecte|selectindex|selectn|selectv|send|sendx|setting|sleep|sselect|status|step|stop|stope|stopm|subr|subroutine|then|to|transabort|transend|transquery|transstart|unlock|until|using|weofseq|while|with|work|write|writeblk|writelist|writeseq|writet|writeu|writev|writevu|writexml)$"))
