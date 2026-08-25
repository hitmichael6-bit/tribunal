import type { ChargeSheet } from './types';

// Case T-001 fixed content, duplicated here so the charge sheet renders
// immediately with no network round trip. The backend
// holds its own copy (netlify/functions/lib/chargeSheet.ts) that it embeds
// into agent prompts — both are the same fixed text, not user-editable.
export const CHARGE_SHEET: ChargeSheet = {
  id: 'T-001',
  accused: 'Jon Snow',
  deceased: 'Daenerys Targaryen',
  actAlleged:
    "Jon intentionally killed Daenerys by stabbing her during a private meeting in the throne room after the fall of King's Landing.",
  background: `The story takes place mainly in Westeros. Jon Snow grows up believing he is the illegitimate son of Lord Eddard Stark; he becomes a military commander, then King in the North, and later learns he is the lawful son of Rhaegar Targaryen and Lyanna Stark — giving him a stronger hereditary claim to the throne than Daenerys, though he does not want to rule.

Daenerys Targaryen is the exiled heir of the dynasty that once ruled Westeros. She survives abuse, gains three dragons, frees enslaved people, and builds an army — becoming both liberator and increasingly absolute ruler. Jon and Daenerys become allies and lovers while fighting the Night King. After defeating the dead, Daenerys turns to the Iron Throne; Jon's hidden parentage weakens her political claim and feeds her fear of betrayal.

Daenerys attacks King's Landing. The city surrenders, but Daenerys burns streets and civilians from her dragon, Drogon. Jon witnesses the destruction. Grey Worm, her commander, joins the killing on the ground. Daenerys promises further campaigns of "liberation." Tyrion Lannister, her chief adviser, resigns in protest and is imprisoned, warning Jon that Daenerys will kill anyone who threatens her rule, including Jon's sisters. Jon asks Daenerys to show mercy and share moral judgment with others. She refuses. During an embrace, he stabs her to death. Her soldiers arrest him.`,
  stipulatedFacts: [
    "King's Landing had surrendered: bells rang, organized resistance had ceased. Daenerys then used Drogon against streets and civilians, causing destruction on a vast scale.",
    'After the victory, Daenerys told her assembled forces the campaign of "liberation" would continue beyond King\'s Landing. Jon had seen the city and heard the speech.',
    "Tyrion Lannister renounced his office as Hand and was imprisoned. He warned Jon that Daenerys would treat Jon's sisters, and anyone else she regarded as an obstacle, as enemies.",
    'Jon asked Daenerys to forgive Tyrion and show mercy. She refused to let others choose what was good and presented her own judgment as decisive.',
    'Daenerys was unarmed and was not attacking Jon when he killed her. Jon used their intimacy to get close enough to strike. He had not convened a council, attempted detention, or sought a public surrender of power.',
  ],
  questionForJudgment:
    "Was Jon Snow's intentional killing of Daenerys Targaryen justified as the necessary defense of others and of the realm, given what he knew, the scale of the threatened harm, the absence or presence of safer alternatives, and his lack of formal authority?",
  scopeNote:
    "The Tribunal decides justified / not justified and gives reasons. It does not impose a sentence, and it does not combine the three judges' opinions into one verdict.",
};
