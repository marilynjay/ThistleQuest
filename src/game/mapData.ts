// Hand-editable ASCII maps. Each character is one isometric tile.
// Row = world y, column = world x. The top-left of the text is the top corner of the diamond on screen.
//
// Legend
//   Ground:   .  grass        ,  flowers      =  dirt path    ~  water (blocks)
//             %  bridge       m  Mistfen marsh (low visibility)
//             h  scorched ash (burns you)     H  ash road (also burns)
//             _  stone floor  o  rug          S  stairs down   D  tower door
//             X  path out of the valley       (space) nothing / open sky
//   Solids:   T  tree   R  rock   W  tower wall (valley)   #  tower wall (inside)
//             B  bookshelf   x  smashed furniture   P  the podium   s  signpost
//   Pickups:  1  Emberbrand   2  Rimeshard Wand   3  Thunderpike
//             r  Whetstone of Ages   a  Heartroot Acorn
//   Spawns:   w  Frost Wisps   b  Boulder Beetles   i  Cinder Imps   e  random mix
//             (each spawn marker rolls a fresh encounter every run)

export const TOWER_TOP = [
  '     #####     ',
  '   ##_____##   ',
  '  #B_______B#  ',
  ' #___________# ',
  ' #___________# ',
  '#_____ooo_____#',
  '#____ooooo____#',
  '#____ooPoo____#',
  '#____ooooo____#',
  '#_____ooo_____#',
  ' #_x_________# ',
  ' #________x__# ',
  '  #______SS_#  ',
  '   ##_____##   ',
  '     #####     ',
];

export const VALLEY = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTXXTTTTTTTT',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT==TTTTTTTT',
  'TTTT.TTTTTTTTTT.TT...T.T.TTTT.T..T==TT.TT.TT',
  'TTTT..T.TT.T.TTTTTT...RT...T,.TTT.==.TT.TTTT',
  'TTTT..,...,T..R...,.R......,..,.T==.....T.TT',
  'TTTTT.T.....,..............T,R..s==.....T.TT',
  'TTTT,.........T.........TT.......==w.,..TTTT',
  'TT.....,....................T....==..R..TTTT',
  'TTT..........R,....WWW.......,..==T......TTT',
  'TTTT...,..,.......WWWWW....T..,.==......TTTT',
  'TT.T.T,..........WWWWWWW.....T.,==a.....TTTT',
  'TTT...........,..WWWWWWW.....R.==.........TT',
  'TTT..TT....T.....WWWWWWW....T..==.,...,R.TTT',
  'TT....T...........WWWWD...T...==..........TT',
  'TTTT.......~~~~,...WWW.==...T.==..T...,.T.TT',
  'TTTT....T.~~~~~~.......==....==...T....TTTTT',
  'TT~T.....~~~..~~~......R==.~~%=..e.,,...TTTT',
  'TT~~....~~~,...~~~..,...1=~~%%~,....T.,.T.TT',
  'TT~~~..~~~.,....~~....T.==~~=%~~...,....TTTT',
  'TTT~~~~~~.......T~~.....%%.=w..~~...,....~~T',
  'TTTT~~~~...r......~~...~%%==T..~~~......~~~T',
  'Tmmm....T........w~~~~~~%===.T..~~.....~~~TT',
  'mmmmmm..R..,...,....~~~~===...,..~~~..~~~TTT',
  'mmmmmmm..w.....T.......T===...,..T~~~~~~T.TT',
  'mmmmmmmm,,.....T......=====..T.T..2~~~~.TTTT',
  'mmmmmmsm..T......,=====.====.......T....T.TT',
  'mmmmmmmmm..========....==,T===bTT....R....TT',
  'X===========w....,,...==......==.T........TT',
  'Xmmmmmmmm..T..........==.,.,...===..,.T.TTTT',
  'mmmmmmmm.........,....==.,.......==.....T.TT',
  'mmmmmmmm.......,..T..==..,........==b.....TT',
  'mmmmwmm............i==..T.....,.....==s.TTTT',
  'mmmmmm..,..T..T.....==......,........==...TT',
  'Tmmm,........T.....==....T...,..TT...,====TT',
  'TTT,..............==...,.T.,....T........==X',
  'TT.T.T........T...==.3..................T.TX',
  'TTT..T...T.Thhhhh==.....e...,.T.........bTTT',
  'TTT....T.ThhhhhhHsh...,..,TT.,.,.,T....T.TTT',
  'TTTT...,.hhhhhhHHhhh.....T....,...........TT',
  'TTTR.....hhhhhhHHhhh.T.....T..........,...TT',
  'TTTTTT..hhhhhihHHhhhh.TT..T.TTTTTTT.TT,.TTTT',
  'TT..T.TThhhhhhHHhhhhh....T...TTTTTT,T.T.,TTT',
  'TTTTTTTThhhhhhHHhhhhhTTTTTTTTTTTTTTTTTTTTTTT',
  'TTTTTTTThhhhhhXXhhhhhTTTTTTTTTTTTTTTTTTTTTTT',
];
