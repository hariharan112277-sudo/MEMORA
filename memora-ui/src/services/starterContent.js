// Sample curriculum used by the built-in demo backend.
// Question tuple: [text, [optA, optB, optC, optD], correctIndex, explanation, difficulty]
// S = initial memory strength (days), ago = days since last review, ability = simulated recall accuracy.

export const STARTER = [
  {
    key: 'cs',
    name: 'Computer Science',
    category: 'Computer Science',
    color: 'indigo',
    description: 'Data structures, algorithms, operating systems and networking fundamentals.',
    topics: [
      {
        key: 'ds', name: 'Hash Tables & Collisions', module: 'Data Structures', difficulty: 'medium', S: 12, ago: 2, ability: 0.85,
        description: 'Hash functions, load factor, chaining vs open addressing.',
        questions: [
          ['What is the average-case lookup time in a hash table with a good hash function?', ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], 0, 'With uniform hashing and a bounded load factor, lookups take constant time on average. The worst case degrades to O(n).', 'easy'],
          ['Which collision strategy stores colliding keys in a linked list inside each bucket?', ['Open addressing', 'Separate chaining', 'Double hashing', 'Cuckoo hashing'], 1, 'Separate chaining keeps a list (or tree) per bucket. Open addressing probes for another free slot instead.', 'easy'],
          ['What happens as the load factor of an open-addressing table approaches 1?', ['Lookups get faster', 'Probe sequences lengthen sharply', 'Nothing changes', 'The table becomes sorted'], 1, 'Fewer empty slots means longer probe sequences, so operations slow down dramatically. This is why tables resize before they fill.', 'medium'],
          ['Why do hash tables usually resize by a constant factor such as doubling?', ['To keep keys sorted', 'To amortize rehashing to O(1) per insert', 'To reduce memory use', 'To avoid all collisions'], 1, 'Doubling makes the expensive rehash rare enough that the amortized cost per insertion stays constant.', 'hard'],
        ],
      },
      {
        key: 'bigo', name: 'Big-O Notation', module: 'Algorithms', difficulty: 'easy', S: 6, ago: 3, ability: 0.7,
        description: 'Asymptotic upper bounds and common complexity classes.',
        questions: [
          ['What is the time complexity of binary search on a sorted array of n elements?', ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], 1, 'Each step halves the search space, so at most log₂ n comparisons are needed.', 'easy'],
          ['Which of these grows fastest as n becomes very large?', ['n log n', 'n²', '2ⁿ', 'n³'], 2, 'Exponential growth eventually dominates every polynomial.', 'easy'],
          ['Big-O notation describes…', ['An exact running time', 'An asymptotic upper bound', 'Only the average case', 'Only memory usage'], 1, 'Big-O gives an upper bound on growth as input size increases, ignoring constants and lower-order terms.', 'medium'],
          ['What is the complexity of: for i in 1..n: for j in 1..i: work()?', ['O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'], 2, 'The inner loop runs 1 + 2 + … + n = n(n+1)/2 times, which is O(n²).', 'medium'],
        ],
      },
      {
        key: 'sched', name: 'CPU Scheduling', module: 'Operating Systems', difficulty: 'medium', S: 4, ago: 6, ability: 0.55,
        description: 'FCFS, SJF, Round Robin, priority scheduling and aging.',
        questions: [
          ['Which scheduling algorithm can starve long processes?', ['Round Robin', 'First-come first-served', 'Shortest job first', 'Multilevel feedback with aging'], 2, 'If short jobs keep arriving, SJF never picks the long ones. Aging is the usual fix.', 'medium'],
          ['In Round Robin, what happens if the time quantum is extremely large?', ['It behaves like FCFS', 'It behaves like SJF', 'It thrashes', 'It deadlocks'], 0, 'A very large quantum means every process finishes within its first slice, which is exactly FCFS.', 'medium'],
          ['Which metric is the time from a process being submitted to its completion?', ['Waiting time', 'Response time', 'Turnaround time', 'Throughput'], 2, 'Turnaround time = completion time − arrival time.', 'easy'],
          ['What does aging do in priority scheduling?', ['Lowers the priority of old processes', 'Gradually raises the priority of waiting processes', 'Terminates old processes', 'Increases the time quantum'], 1, 'Aging prevents starvation by boosting the priority of processes that have waited a long time.', 'medium'],
        ],
      },
      {
        key: 'tcp', name: 'TCP Handshake & Congestion', module: 'Networking', difficulty: 'hard', S: 9, ago: 1, ability: 0.8,
        description: 'Connection setup, slow start, fast recovery and teardown.',
        questions: [
          ['What is the order of the TCP three-way handshake?', ['SYN, ACK, SYN-ACK', 'SYN, SYN-ACK, ACK', 'SYN-ACK, SYN, ACK', 'ACK, SYN, SYN-ACK'], 1, 'The client sends SYN, the server replies SYN-ACK, and the client completes with ACK.', 'easy'],
          ['During slow start, the congestion window grows…', ['Linearly per RTT', 'Exponentially per RTT', 'Not at all', 'By halving each RTT'], 1, 'The window roughly doubles every round trip until it reaches the slow-start threshold.', 'medium'],
          ['On three duplicate ACKs, TCP Reno typically…', ['Resets cwnd to 1 MSS', 'Halves cwnd and enters fast recovery', 'Doubles cwnd', 'Closes the connection'], 1, 'Duplicate ACKs signal mild congestion, so Reno performs fast retransmit and fast recovery instead of restarting slow start.', 'hard'],
          ['Which TCP flag gracefully closes one direction of a connection?', ['RST', 'FIN', 'PSH', 'URG'], 1, 'FIN signals that the sender has no more data; RST aborts the connection abruptly.', 'easy'],
        ],
      },
    ],
  },
  {
    key: 'med',
    name: 'Medical Physiology',
    category: 'Medical',
    color: 'rose',
    description: 'Cardiovascular, renal and pharmacology essentials for clinical exams.',
    topics: [
      {
        key: 'cardiac', name: 'Cardiac Cycle', module: 'Cardiovascular', difficulty: 'hard', S: 7, ago: 5, ability: 0.6,
        description: 'Pressure–volume events, heart sounds and stroke volume.',
        questions: [
          ['Which event marks the start of ventricular systole?', ['Opening of the semilunar valves', 'Closure of the AV valves (S1)', 'Atrial contraction', 'Closure of the semilunar valves'], 1, 'When ventricular pressure exceeds atrial pressure the AV valves slam shut, producing the first heart sound (S1).', 'medium'],
          ['The dicrotic notch on the aortic pressure curve reflects…', ['Aortic valve closure', 'Mitral valve opening', 'Atrial kick', 'Isovolumetric contraction'], 0, 'Brief backflow closes the aortic valve, causing a small rebound in pressure.', 'hard'],
          ['Which phase contributes most to passive ventricular filling?', ['Isovolumetric contraction', 'Rapid ventricular filling', 'Ejection', 'Isovolumetric relaxation'], 1, 'Right after the AV valves open, blood rushes in passively; atrial contraction adds only about 20%.', 'medium'],
          ['Stroke volume is equal to…', ['ESV − EDV', 'EDV − ESV', 'HR × CO', 'CO × TPR'], 1, 'Stroke volume is the volume ejected per beat: end-diastolic volume minus end-systolic volume.', 'easy'],
        ],
      },
      {
        key: 'renal', name: 'Nephron Physiology', module: 'Renal', difficulty: 'medium', S: 10, ago: 3, ability: 0.72,
        description: 'Segments of the nephron, transporters and diuretic targets.',
        questions: [
          ['Where is most filtered sodium and water reabsorbed?', ['Proximal tubule', 'Loop of Henle', 'Distal convoluted tubule', 'Collecting duct'], 0, 'The proximal tubule reabsorbs roughly two-thirds of filtered sodium and water.', 'easy'],
          ['Which segment is the site of action of loop diuretics such as furosemide?', ['Proximal tubule', 'Thick ascending limb', 'Distal convoluted tubule', 'Collecting duct'], 1, 'Loop diuretics block the Na⁺-K⁺-2Cl⁻ cotransporter (NKCC2) in the thick ascending limb.', 'medium'],
          ['ADH increases water reabsorption by inserting which channel?', ['ENaC', 'Aquaporin-2', 'SGLT2', 'NKCC2'], 1, 'ADH (vasopressin) triggers insertion of aquaporin-2 channels into collecting duct principal cells.', 'medium'],
          ['GFR is best estimated by the clearance of a substance that is…', ['Freely filtered and neither reabsorbed nor secreted', 'Completely reabsorbed', 'Actively secreted', 'Bound to albumin'], 0, 'Inulin (and, clinically, creatinine as an approximation) fits this profile, so its clearance equals GFR.', 'hard'],
        ],
      },
      {
        key: 'pk', name: 'Pharmacokinetics Basics', module: 'Pharmacology', difficulty: 'medium', S: 14, ago: 1, ability: 0.9,
        description: 'Bioavailability, half-life, steady state and volume of distribution.',
        questions: [
          ['What is the bioavailability of an intravenous dose?', ['0%', '50%', '100%', 'Depends on first-pass metabolism'], 2, 'IV drugs enter the circulation directly, so bioavailability is 100% by definition.', 'easy'],
          ['After one half-life of first-order elimination, what fraction of the drug remains?', ['75%', '50%', '25%', '12.5%'], 1, 'By definition half of the drug is eliminated in one half-life.', 'easy'],
          ['Approximately how many half-lives of regular dosing are needed to reach steady state?', ['1', '2', '4 to 5', '10'], 2, 'After about 4–5 half-lives, accumulation reaches roughly 94–97% of steady-state levels.', 'medium'],
          ['Volume of distribution relates…', ['The amount of drug in the body to its plasma concentration', 'Clearance to half-life only', 'Bioavailability to absorption rate', 'Protein binding to renal excretion'], 0, 'Vd = amount of drug in the body ÷ plasma concentration.', 'medium'],
        ],
      },
    ],
  },
  {
    key: 'law',
    name: 'Contract & Tort Law',
    category: 'Law',
    color: 'amber',
    description: 'Common-law foundations of agreements and civil wrongs.',
    topics: [
      {
        key: 'contract', name: 'Contract Formation', module: 'Contracts', difficulty: 'medium', S: 8, ago: 2, ability: 0.75,
        description: 'Offer, acceptance, consideration and intention to create legal relations.',
        questions: [
          ['Which of these is NOT a required element of a valid common-law contract?', ['Offer', 'Acceptance', 'Consideration', 'Notarization'], 3, 'Notarization is not needed for most contracts; offer, acceptance, consideration and intention are.', 'easy'],
          ['An advertisement is generally treated as…', ['A binding offer', 'An invitation to treat', 'A counter-offer', 'An acceptance'], 1, 'Ads usually invite offers from the public (Partridge v Crittenden), with exceptions such as unilateral offers in Carlill v Carbolic Smoke Ball.', 'medium'],
          ['Under the mirror-image rule, an acceptance that changes the terms is…', ['A valid acceptance', 'A counter-offer that rejects the original offer', 'Void from the start', 'Merely a request for information'], 1, 'Acceptance must match the offer exactly; a change of terms operates as a counter-offer.', 'medium'],
          ['Past consideration is generally…', ['Good consideration', 'Not good consideration', 'Valid only if in writing', 'Always nominal'], 1, 'Something already done before the promise was made cannot support that promise, with limited exceptions.', 'hard'],
        ],
      },
      {
        key: 'negl', name: 'Negligence Elements', module: 'Torts', difficulty: 'hard', S: 5, ago: 6, ability: 0.5,
        description: 'Duty of care, breach, causation and damage.',
        questions: [
          ['Which is NOT one of the classic elements of negligence?', ['Duty of care', 'Breach of duty', 'Causation', 'Intent to harm'], 3, 'Negligence requires duty, breach, causation and damage. Intent is not required.', 'easy'],
          ['The "but for" test addresses which element?', ['Duty', 'Breach', 'Factual causation', 'Remoteness'], 2, 'But for the defendant’s act, would the harm have occurred? That is the test of factual causation.', 'medium'],
          ['The "reasonable person" standard is used to assess…', ['Whether a duty exists', 'Breach of duty', 'The amount of damages', 'Jurisdiction'], 1, 'Breach is judged against how a reasonable person would have acted in the circumstances.', 'medium'],
          ['Which case established the modern "neighbour principle"?', ['Donoghue v Stevenson', 'Carlill v Carbolic Smoke Ball', 'Rylands v Fletcher', 'Hadley v Baxendale'], 0, 'Lord Atkin’s speech in Donoghue v Stevenson (1932) set out the neighbour principle.', 'easy'],
        ],
      },
    ],
  },
  {
    key: 'lang',
    name: 'Languages',
    category: 'Languages',
    color: 'emerald',
    description: 'Grammar patterns for Spanish, Japanese and French.',
    topics: [
      {
        key: 'pret', name: 'Spanish Preterite vs Imperfect', module: 'Spanish', difficulty: 'medium', S: 11, ago: 1, ability: 0.85,
        description: 'Choosing between completed actions and ongoing or habitual past.',
        questions: [
          ['In "Cuando era niño, jugaba al fútbol cada día", the imperfect "jugaba" expresses…', ['A single completed event', 'A habitual past action', 'A future plan', 'A command'], 1, 'The imperfect describes habitual or repeated actions in the past.', 'easy'],
          ['Choose the correct form: "Ayer yo ___ al cine."', ['iba', 'fui', 'voy', 'iré'], 1, '“Ayer” marks a completed event, so the preterite “fui” is correct.', 'easy'],
          ['Which tense narrates background description and ongoing states in the past?', ['Preterite', 'Imperfect', 'Future', 'Conditional'], 1, 'The imperfect sets the scene; the preterite moves the plot forward.', 'medium'],
          ['"Mientras ella ___ (leer), el teléfono ___ (sonar)." Which pair is correct?', ['leyó / sonaba', 'leía / sonó', 'leía / sonaba', 'leyó / sonó'], 1, 'An ongoing action (leía) is interrupted by a completed one (sonó).', 'hard'],
        ],
      },
      {
        key: 'part', name: 'Japanese Particles は / が / を', module: 'Japanese', difficulty: 'medium', S: 5, ago: 4, ability: 0.6,
        description: 'Topic, subject, object, location and possession particles.',
        questions: [
          ['Which particle typically marks the topic of a sentence?', ['が', 'は', 'を', 'に'], 1, 'は (read “wa”) marks the topic; が marks the grammatical subject.', 'easy'],
          ['Which particle marks the direct object?', ['を', 'で', 'と', 'の'], 0, 'を (read “o”) marks the direct object of a verb.', 'easy'],
          ['In 図書館で勉強します, what does で mark?', ['Direction', 'The place where an action happens', 'Possession', 'The direct object'], 1, 'で marks the location of an action, while に marks a destination or existence location.', 'medium'],
          ['Which particle expresses possession, like “’s” or “of”?', ['の', 'も', 'か', 'へ'], 0, 'の links nouns: 私の本 means “my book”.', 'easy'],
        ],
      },
      {
        key: 'gender', name: 'French Noun Gender', module: 'French', difficulty: 'easy', S: 9, ago: 3, ability: 0.72,
        description: 'Gender patterns, endings and articles.',
        questions: [
          ['Which noun is masculine?', ['la table', 'le problème', 'la maison', 'la fenêtre'], 1, '“Problème” is masculine despite ending in -e, a classic exception to the -e = feminine rule of thumb.', 'medium'],
          ['Words ending in -tion are usually…', ['Masculine', 'Feminine', 'Neuter', 'Either gender'], 1, 'Nouns ending in -tion are almost always feminine (la nation, la question).', 'easy'],
          ['Which ending is a strong indicator of a masculine noun?', ['-age', '-tion', '-ette', '-té'], 0, 'Nouns in -age are usually masculine (le voyage), with a few exceptions such as la page.', 'medium'],
          ['Choose the correct article: ___ université', ['le', 'la', 'un', 'les'], 1, 'Université is feminine, like most nouns ending in -té.', 'easy'],
        ],
      },
    ],
  },
];
