// Hand-editable ASCII maps. Each character is one isometric tile.
// Row = world y, column = world x. The top-left of the text is the top corner of the diamond on screen.
//
// Legend
//   Ground:   .  grass        ,  flowers      =  dirt path    ~  water (blocks)
//             %  bridge       m  Mistfen marsh (low visibility)
//             h  scorched ash (burns you)     H  ash road (also burns)
//             _  stone floor  o  rug          S  stairs down   D  tower door
//             X  path out of the valley       (space) nothing / open sky
//   Solids:   T  tree   R  rock   W  tower wall (valley)   #  wall (inside the tower)
//             k  furniture (drawn by the tower's prop list)   s  signpost
//   Markers:  P  the dais where Thistle respawns (walkable)
//   Pickups:  1  Emberbrand   2  Rimeshard Wand   3  Thunderpike
//             r  Whetstone of Ages   a  Heartroot Acorn
//   Spawns:   w  Frost Wisps   b  Boulder Beetles   i  Cinder Imps   e  random mix
//             (each spawn marker rolls a fresh encounter every run)

// The high study at the top of the Wizard's tower. The back walls (row 0 and column 0) stand tall;
// the front walls (row 13 and column 13) are cut away so you can see in. S is the arched doorway down.
export const TOWER_TOP = [
  '##############',
  '#kkk___kkkkkk#',
  '#____________#',
  '#k___________#',
  '#k___________#',
  '#____________#',
  '#_____P______#',
  '#____________#',
  '#k_______k___#',
  '#k_____kkk_k_#',
  '#_________k__#',
  '#k___________#',
  '#____kk______#',
  '###SS#########',
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
