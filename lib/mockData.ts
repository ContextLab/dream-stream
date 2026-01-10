import type { Category, DreamListItem, Dream, MusicStyle } from '@/types/database';

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Adventure', slug: 'adventure', color: '#F59E0B', icon: '⚔️', sort_order: 1 },
  { id: 'cat-2', name: 'Joy', slug: 'joy', color: '#EC4899', icon: '✨', sort_order: 2 },
  { id: 'cat-3', name: 'Creativity', slug: 'creativity', color: '#8B5CF6', icon: '🎨', sort_order: 3 },
  { id: 'cat-4', name: 'Calming', slug: 'calming', color: '#06B6D4', icon: '🌊', sort_order: 4 },
  { id: 'cat-5', name: 'Relaxation', slug: 'relaxation', color: '#22C55E', icon: '🧘', sort_order: 5 },
  { id: 'cat-6', name: 'Self-Esteem', slug: 'self-esteem', color: '#EF4444', icon: '💪', sort_order: 6 },
  { id: 'cat-7', name: 'Healing', slug: 'healing', color: '#3B82F6', icon: '💚', sort_order: 7 },
  { id: 'cat-8', name: 'Mental Clarity', slug: 'mental-clarity', color: '#6366F1', icon: '🧠', sort_order: 8 },
  { id: 'cat-9', name: 'Renewal', slug: 'renewal', color: '#14B8A6', icon: '🌱', sort_order: 9 },
];

interface DreamContent {
  title: string;
  music: MusicStyle;
  content: string;
}

// All dreams include lucid dreaming elements:
// - Reality check prompts
// - Awareness cues ("You are dreaming", "This is your dream")
// - Dream control guidance
// - [PAUSE] markers for exploration periods in Dream It mode

const DREAM_SCRIPTS: DreamContent[] = [
  {
    title: 'Floating Through Clouds',
    music: 'ambient',
    content: `You find yourself weightless, suspended in an endless sky of soft white clouds. Take a moment to look at your hands. Notice how they shimmer slightly, how the light passes through them at the edges. This is how you know you are dreaming. You are dreaming now, and you are aware.

The air is warm and gentle against your skin. As you breathe deeply, you begin to drift upward, passing through wisps of mist that feel like silk. There is no fear here, only peace. Only the gentle embrace of the sky itself. You are safe. You are aware. You are in control of this dream.

Below you, the clouds part to reveal glimpses of a world painted in watercolors. Mountains rise like purple shadows in the distance. Rivers wind like silver ribbons through valleys of impossible green. Notice how the colors are more vivid than waking life. This is a sign of dreaming. Let this awareness deepen your peace.

With each breath, you float higher. The sky deepens to shades of rose and gold. You realize you can move simply by thinking about where you want to go. Try it now. Think of drifting to the left, and feel yourself glide effortlessly. This is your dream. Your intention shapes everything here.

[PAUSE]

A cloud takes the form of a great whale, swimming through the sky beside you. In waking life, this would be impossible. Here, in your dream, it is natural and beautiful. Reach out and touch the whale if you wish. Feel how your dream responds to your curiosity.

You discover that the clouds have layers, like the pages of an infinite book. You sink through one layer and find yourself in a world of silver moonlight. The clouds glow with soft phosphorescence. Creatures made of starlight swim past you. Remember: you are dreaming. You are aware. You can explore freely.

There are other dreamers here, you sense them more than see them. Kindred spirits floating in their own private heavens. In the world of dreams, all consciousness is connected. Send them wordless greetings of peace and feel the same returned to you.

[PAUSE]

The clouds begin to form a bed around you, the softest bed imaginable. You sink into it, surrounded by warmth and light. As you rest here, remember this feeling. This peace is available to you whenever you dream. You need only remember that you are dreaming, and the peace will find you.

Stars begin to appear, even though it is still day. They twinkle through the clouds like diamonds scattered on silk. In dreams, day and night can exist together. Reach out and touch a star. Feel how it responds to you, how the dream bends to your awareness.

A rainbow forms around you, not an arc but a complete sphere, surrounding you in bands of color. Float through each color and feel its quality. Red is warm. Orange is creative. Yellow is hopeful. Green is healing. Blue is calm. Purple is wise. You are absorbing these qualities into your dream self.

[PAUSE]

A great bird made of clouds glides past, offering you a ride on its back. In your lucid dream, you can accept. Climb onto feathers made of condensed starlight. Feel the wind as it carries you higher. You are the dreamer. This bird exists because you allow it. Thank it for the journey.

At the highest level, the clouds become thoughts themselves. You can see the dreams of everyone below, floating like lanterns in the sky. Your awareness has expanded. You are not just in the dream. You are becoming one with the dream itself.

The clouds form a final cocoon around you. Inside, you integrate everything you have experienced. The floating, the colors, the awareness. When you wake, you will remember this feeling. And the next time you find yourself floating, you will know: I am dreaming.`,
  },
  {
    title: 'Crystal Cave Discovery',
    music: 'piano',
    content: `You stand at the entrance of a cave that glows from within. The walls are lined with crystals of every color, each one pulsing with soft inner light. Look at your hands in the crystal light. See how they glow? This is how you know you are dreaming. Welcome to your lucid dream.

As you step inside, the crystals respond to your presence. They brighten where you walk, creating a path of light just for you. In waking life, crystals don't respond to people this way. Here, in your dream, everything responds to your awareness. You are the dreamer. The dream knows you.

Reach out and touch a crystal. Feel it chime like a tiny bell, sending ripples of color through its neighbors. The sound resonates deep in your chest. This is your dream creating beauty for you. Let the music of the crystals remind you: you are aware, you are dreaming, you are safe.

[PAUSE]

Deeper you go, and the crystals grow larger. Some are as tall as trees, reaching from floor to ceiling in spirals of frozen light. Their colors shift as you approach. In a lucid dream, you can influence these colors. Think of your favorite color and watch the crystals respond.

The musical hum grows stronger here. The crystals are singing to you. They sing: You are dreaming. You are aware. You belong here. Let their song anchor your lucidity. As long as you hear them, you will remember this is a dream.

A side passage opens to your left, lined with crystals of deep purple. You feel drawn to explore it. In your lucid dream, you can trust these feelings. They are your deeper self, guiding you toward what you need to experience. Follow the purple light.

[PAUSE]

At the bottom, you find a small chamber where a single crystal grows from the center of the floor. It is completely clear, like frozen water, and inside it you can see everything. Stars being born. Flowers blooming. The crystal contains the entire universe.

Place your hands on its surface. Feel visions flow into you. A beach at sunset. A forest in autumn. A mountain peak above the clouds. These are gifts from your dreaming mind, memories and possibilities woven together. Accept them with gratitude.

The crystal has taken something from you too. Your worries, your fears, your doubts. Watch them float inside the crystal, tiny dark specks being slowly dissolved by light. In your lucid dream, you can release what no longer serves you. Let it go.

[PAUSE]

The cave opens into a vast chamber. An underground lake stretches before you, its surface perfectly still. In the center, a massive crystal rises from the water, rotating slowly, casting rainbow patterns across the walls.

Walk to the water's edge. In dreams, water is a mirror to your inner self. Look at your reflection. See how it glows with awareness. This is your dream self, the part of you that knows you are dreaming. Greet yourself with love.

You can walk on this water if you choose. In your lucid dream, the laws of physics bend to your intention. Step onto the surface and feel it support you. Walk toward the central crystal. With each step, your lucidity deepens.

[PAUSE]

Touch the singing crystal. Feel your consciousness expand. You are not just in the cave now. You are the cave. You are the crystals. You are the light itself. This is what full lucidity feels like: boundless, connected, free.

The cave whispers that you can return whenever you dream. Look for crystals in your dreams. When you see them glow, you will remember: I am dreaming. This is your anchor, your key to lucidity.

As you prepare to leave, take a small crystal with you. Feel it warm in your hand. In your waking life, you cannot carry dream objects. But the feeling of this crystal, the peace of this cave, that you carry always. And it will guide you back here, whenever you need to remember who you truly are.`,
  },
  {
    title: 'Ocean of Stars',
    music: 'cosmic',
    content: `You float in darkness, but it is not empty. Around you, in every direction, stars begin to appear. Not distant points of light, but close enough to touch. Look at your hands among the stars. See how starlight plays across your fingers? You are dreaming. You are aware. Welcome to your lucid dream.

Reach out and cup a star in your hands. Feel how warm it is, how it hums with energy. In waking life, stars are nuclear furnaces millions of miles away. Here, in your dream, they are gentle companions. This impossibility is your proof of dreaming. Let it awaken your full awareness.

You are swimming in space, and space is welcoming you home. There is no need to breathe here, no need for warmth or protection. Your dream body is perfect for this environment. You are the dreamer. The cosmos reshapes itself around your consciousness.

[PAUSE]

The stars form patterns as they flow. Constellations you've never seen tell stories you somehow understand. A great spiral forms beneath you, pulling stars into its arms like dancers in an eternal waltz. You are witnessing the birth of a galaxy, compressed into moments you can perceive.

Realize now: you are not just watching the universe. You are part of it. Made of the same light, the same ancient stardust. In your lucid dream, this truth becomes experience. Feel your boundaries dissolve. Feel yourself become infinite.

A nebula drifts past, painting the darkness in shades of purple and gold. Swim through it. In your dream, you can move through cosmic clouds of creation. Feel the gases flow through you like breath. You are being born along with the stars. You are ancient and newborn at once.

[PAUSE]

The cosmic ocean has currents, rivers of gravity that carry stars and dreamers to distant shores. Let yourself be caught in one. Feel yourself carried past wonders beyond counting. Galaxies spiral beneath you. Black holes sing in frequencies too low to hear but deep enough to feel.

A planet swims into view, blue and green and alive with light. Not Earth, but something like Earth. Something that could be home. In your lucid dream, you can drift closer. See oceans and mountains and cities that glow in the night.

Beings there look up at their sky and see you, a new star in their heavens. In the dream world, consciousness touches consciousness across impossible distances. Wave to them. Feel them wave back. You are all dreamers, after all.

[PAUSE]

The cosmic current carries you on, into the deep space between galaxies. Here the darkness is profound. But close your dream eyes and feel: you can sense dark matter, invisible but essential, holding the universe together with gentle hands.

A comet passes, trailing light and ice and ancient memory. Touch its tail and receive visions. The first stars. The first planets. The first life. In your lucid dream, time is not a barrier. All of history is accessible to the aware dreamer.

You feel profoundly old and eternally young at the same time. This is the gift of lucid dreaming: perspective beyond your single life. You are the universe experiencing itself. You are consciousness dreaming of stars.

[PAUSE]

You see your own galaxy from outside. It is beautiful beyond words, a spiral of light and life and possibility. Somewhere in there is your sun, your Earth, your sleeping body. But your consciousness is here, free to explore the cosmos.

The stars wrap around you like a blanket of light. You are warm. You are safe. You are dreaming, and you know it. This knowledge is your power. This awareness is your gift.

When you wake, you will remember this vastness. You will remember that you are made of stars. And the next time you see stars in a dream, you will remember: I am dreaming. And the cosmos will welcome you home.`,
  },
  {
    title: 'Forest of Whispers',
    music: 'nature',
    content: `Ancient trees surround you, their trunks wider than houses, their canopy so high it disappears into golden mist. Take a moment. Look at your hands against the bark of the nearest tree. Notice how your skin glows faintly in the forest light. You are dreaming. You are aware. This forest has been waiting for you.

The air is thick with the scent of moss and earth and growing things. Breathe deeply. In dreams, smells are often muted, but here they are vivid and alive. Let this richness remind you: you are in a lucid dream. Your awareness makes everything more real.

The forest is alive with gentle sounds. Leaves rustling secrets to each other. Distant birdsong that sounds like laughter. And beneath it all, a deep, slow rhythm, like the heartbeat of the earth itself. Match your breath to this ancient pace. You are synchronizing with the dream.

[PAUSE]

As you walk the soft path, mushrooms glow in rings around your feet. Flowers turn to follow your movement. A deer made of light watches you from between the trees. In waking life, forests don't respond to visitors this way. Here, in your dream, you are recognized. You are welcomed.

Streams cross your path, clear water singing over stones. Kneel and drink. In your lucid dream, this water tastes of peace itself. Feel it flow through you, cleansing, refreshing. Dream water can heal things that waking water cannot reach.

You come to a clearing where a great tree stands alone. Its bark is carved with symbols that shift and change as you watch. Place your palm against it and feel centuries of wisdom flow into you. This tree has seen empires rise and fall. It has sheltered countless dreamers. It knows you.

[PAUSE]

The tree shows you the forest through time. You see it as a seedling, when the world was young. You watch it grow through ages of ice and fire. You see the first humans enter, wide-eyed and wondering. In your lucid dream, time is fluid. All of history is now.

A path opens in the undergrowth, leading deeper. Follow it. In lucid dreams, paths that appear are invitations from your deeper self. Trust where they lead. The forest knows what you need to experience.

In a sun-dappled glade, you find a circle of standing stones. They hum with power you can feel in your bones. Step into the circle. Here, past and future merge into eternal present. Here, your lucidity reaches its peak.

[PAUSE]

A spirit of the forest approaches. It has no fixed form, shifting between animal and plant and light and shadow. It does not speak in words, but you understand perfectly. You are welcome here. You are protected here. You are loved here.

The spirit leads you to a part of the forest where the trees are old beyond measure. Their roots extend miles into the earth. Their branches touch clouds and stars. In your dream, you can perceive this vastness. You can feel yourself as one tree among many, connected to all.

One of these ancient trees has a door at its base. Enter. Inside, the tree is hollow and vast, larger than its outside suggests. In dreams, spaces contain more than they appear. Climb the spiral staircase. Your awareness rises with each step.

[PAUSE]

At the top, you emerge onto a platform above the canopy. The sun is setting, painting everything gold and rose. Other treetops rise like islands in a leafy ocean. In your lucid dream, you can see forever.

A nest made for dreamers waits for you. Lie back and watch the stars emerge. The forest sings its nighttime song: owls, crickets, wind through leaves. You are safe. You are aware. You are exactly where you need to be.

Remember this place. The next time you see ancient trees in a dream, you will remember: I am dreaming. The forest will welcome you back. The trees will whisper your name. And you will know the peace that only lucid dreamers know.`,
  },
  {
    title: 'City in the Sky',
    music: 'ambient',
    content: `Towers of gleaming white stone rise into clouds that glow pink and gold. Bridges of light connect the spires. Look down at your feet. You are standing on nothing but air, yet you do not fall. This impossibility is your sign. You are dreaming. You are aware. Welcome to your lucid dream.

This is a city that exists beyond the earth, beyond time, beyond everything you thought you knew. And somehow, impossibly, you are here. Not by accident. Your dreaming mind has brought you to this place because you are ready to experience it.

You walk streets paved with something that feels like solidified moonlight. Gardens grow on every balcony, filled with flowers that sing when the wind touches them. Fountains spray water that falls upward. Every impossibility reminds you: this is a dream. You are aware. You are in control.

[PAUSE]

The inhabitants are kind but mysterious. They speak in colors and music rather than words. Let yourself understand them. In lucid dreams, language barriers dissolve. Feel the warm gold of their greeting. Respond with whatever color rises in your heart.

One takes your hand and leads you to a balcony overlooking an infinite sunset. From here, you can see other sky cities floating in the distance. Some are made of crystal. Others are forests growing on clouds. In your lucid dream, all of these exist. All can be explored.

You are told, in colors and tones, that you can stay as long as you wish. Time moves differently here. A lifetime might be a moment in the waking world. A moment here might change your life forever. The choice is yours. In lucid dreams, you always have choice.

[PAUSE]

Explore upward. In your dream, you can climb stairs made of condensed starlight. Find yourself in districts where buildings are transparent, revealing their inner workings of gears and light. Great machines powered by dreams keep the city aloft. Listen to them sing.

Explore downward through levels carved from cloud itself. Find gardens where plants grow concepts instead of fruit. Here is a tree of peace. There is a vine of joy. Taste a fruit of wisdom. In your lucid dream, you can consume ideas directly and feel them become part of you.

A library stands at the city's heart. Its shelves extend into dimensions you can't quite see. Books here contain not words but experiences. Open one and suddenly you are standing on a mountain peak at sunrise. Close it. Open another. Swim with dolphins in a phosphorescent sea.

[PAUSE]

The librarian, a being of pure light, offers to help you find what you're looking for. But you don't know what that is. They smile warmly and lead you to a book with no title. This is yours, they explain in colors. Your story, still being written.

Open your book. See pages filled with light and shadow, joy and sorrow. Some pages are blank, waiting to be written. The ink is your choices. The pen is your actions. Even in dreams, you are the author of your life.

At twilight, the sky people gather in the central plaza. Join them. Music plays from nowhere and everywhere. The sky people dance, their movements creating patterns of light. In your lucid dream, you can dance too. Move without self-consciousness. Your dream body knows how.

[PAUSE]

Night falls, but night here is different. The darkness is warm and welcoming, filled with soft lights like fireflies. Your room has no walls, just curtains of light. A bed of clouds waits for you.

From your bed, you can see stars above and clouds below. You are suspended between heaven and earth. This is freedom. Not freedom from responsibility, but freedom to become who you truly are.

As you drift toward sleep within the dream, remember this place. The city in the sky exists whenever you dream of it. Look for towers in your dreams. Look for bridges of light. When you see them, you will remember: I am dreaming. And the city will welcome you home.`,
  },
  {
    title: 'Endless Staircase',
    music: 'piano',
    content: `Before you rises a staircase of impossible geometry. It spirals upward and downward simultaneously. Look at the stairs. In waking life, this would be impossible. Here, it is natural. This paradox is your proof. You are dreaming. You are aware. Place your foot on the first step.

Each step is a different color. Each landing is a window to another world. The stairs seem to go on forever, and yet you sense that every destination is exactly the right number of steps away. In lucid dreams, distance is measured by intention, not space.

The first landing shows you a window into your childhood. Through the glass, you see yourself playing in summer grass, catching fireflies at dusk. In your lucid dream, you can step through this window if you wish. Revisit the moment. Feel the joy again. The past is accessible here.

[PAUSE]

You climb on. The next window shows an ocean world where whales fly through currents of light. This is not memory but possibility. A world that exists because someone imagined it. In your lucid dream, imagination and reality are the same thing.

Each window is a doorway. You could step through any of them and live that life, explore that world. The staircase offers infinite choice. But something draws you onward, upward, toward a destination you sense but cannot name. Trust this feeling. Your lucid mind knows where it needs to go.

The stairs shift beneath you, but you never lose your balance. The staircase responds to your thoughts. Think of joy, and you rise toward golden light. Think of peace, and you descend into cool, quiet blue. Experiment. Feel how your intentions shape the dream.

[PAUSE]

You pass through a landing made entirely of mirrors. In each reflection, you see yourself living a different life. Here you are an artist. There you are a healer. Over there, you are simply happy. None of these reflections judge. They show what could be, not what should be.

A landing of crystal offers a view into a world of music. Everything there is song. Mountains sing in deep bass tones. Rivers harmonize. In your lucid dream, you can hear this symphony. Let it fill you. Let it remind you how vast your dreaming mind truly is.

In a small alcove, find a window that shows nothing but gentle darkness. Touch it and feel profound peace. This is the space between thoughts, the silence between heartbeats. It is not empty but full of potential. In lucid dreams, darkness is fertile ground.

[PAUSE]

Rest here for a while. The staircase waits patiently. It has existed since the first being asked "what if?" and will exist until the last. There is no rush. In your lucid dream, you have all the time you need.

The stairs begin to show moments from your own life. Here is your first success. There is your deepest connection. But also the difficult moments: losses, disappointments, times you felt alone. The staircase doesn't hide these. It shows them in context, surrounded by what came before and after.

See how even hard times led somewhere meaningful. See how strong you became by surviving them. In your lucid dream, you can view your life from above, see patterns you couldn't see while living them.

[PAUSE]

You reach a landing where the staircase splits into many paths. Each leads to a different door, a different version of your life. You could take any of them. They are all real. They are all valid.

But you don't have to choose. The staircase is not about reaching a destination. It is about the climbing. About the views along the way. About discovering that you are capable of infinite growth.

At the center of the spiral, find a space that is all spaces. Every window is here, every view, every possibility. You stand at the heart of infinity. This is what full lucidity feels like: boundless, connected, free.

When you wake, look for stairs in your dreams. Stairs that spiral impossibly. Stairs that lead to windows. When you see them, remember: I am dreaming. And the staircase will welcome you back, ready to show you new wonders.`,
  },
  {
    title: 'Garden of Light',
    music: 'binaural',
    content: `Flowers made of pure light bloom around you. Each one glows with its own inner sun. Look at your hands in this luminescence. See how they shimmer? You are dreaming. You are aware. This is your lucid dream, and it is made of light.

Bend to examine a flower. It opens further for you, revealing patterns of impossible complexity. Fractals within fractals, colors that have no names. The petals feel like cool fire against your fingertips. In waking life, light cannot be touched. Here, in your dream, everything is possible.

Butterflies of light dance from bloom to bloom. Where they land, new flowers spring up instantly. In your lucid dream, you can do this too. Touch the ground and watch light flowers burst forth. You are not just in this garden. You are creating it with every step.

[PAUSE]

Walk deeper into the meadow, leaving a trail of new blooms behind you. The garden welcomes your contributions. Nothing is rejected here. Every light is beautiful. Every flower has its place. In lucid dreams, you cannot make mistakes. Only discoveries.

At the center stands a tree made entirely of luminescence. Its trunk pulses with slow rhythms, like a heartbeat made visible. Approach it with reverence. In dreams, trees are often symbols of your deepest self. This tree knows you. It has been waiting for you.

Reach up and pluck a fruit that glows the soft amber of sunset. When you taste it, warmth floods through you. Every peaceful evening you have ever experienced, compressed into a single moment. This is what dream food offers: distilled experience.

[PAUSE]

Taste a fruit that glows the fresh blue of dawn. Feel possibility, new beginnings, the sense that anything could happen. A fruit of white light brings understanding. Patterns connect in your mind, revealing truths you always sensed but never grasped.

The tree offers freely. There is no limit, no scarcity. Light cannot be exhausted. In your lucid dream, abundance is the natural state. Take what you need. Know that more will grow.

Lie down among the flowers. They lean over you protectively, creating a canopy of living light. Their warmth seeps into your muscles, releasing tensions you didn't know you held. You are becoming lighter, not in weight but in spirit.

[PAUSE]

The light begins to enter you. Feel it filling every cell. You are becoming luminescent yourself, glowing softly from within. This is not transformation but revelation. You were always made of light. The dream is showing you what was always true.

Creatures drift through the garden, beings that have no form but light. They greet you with pulses of color. Respond in kind. Here, communication is pure. Understanding flows directly from mind to mind, heart to heart.

The creatures show you things about yourself. Not judgments, but observations rendered in light. Here is your kindness, glowing soft pink. There is your courage, burning steady gold. Your creativity swirls in rainbow spirals. Your love shines warm and constant like a sun.

[PAUSE]

They show you your shadows too. But here, even shadows are made of light. Fear is a gentle blue, asking to be understood. Anger is a deep red, seeking expression. Sadness is a soft purple, needing to be felt. In this garden, everything belongs.

Spend time with each of your colors. Water your kindness with attention. Give your courage room to grow. Let your shadows exist without shame. They are part of your full spectrum, your complete beauty.

When you feel ready, rise. A small light flower detaches and floats to you, settling against your heart. It will stay with you, the garden says. A piece of this place to carry into the world.

When you wake, look for light in your dreams. Gardens that glow. Flowers made of luminescence. When you see them, remember: I am dreaming. And the light will welcome you back, always.`,
  },
  {
    title: 'Mirror World',
    music: 'cosmic',
    content: `You stand before a mirror that shows not your reflection, but another world. The world behind the glass shimmers, painted in colors more vivid than waking life. Look at your hands, then at their reflection. They don't quite match. This is how you know. You are dreaming. You are aware.

Without hesitation, step through the mirror. In lucid dreams, you can pass through glass like water. Feel the cool ripple as you cross the boundary between worlds. You are now in the mirror realm, where everything is reversed and transformed.

Everything here is familiar but different. Gravity pulls gently in whatever direction you choose. Colors are richer, sounds are clearer. You feel more real here than in waking life. The mirror world has been waiting for you. Now it embraces you completely.

[PAUSE]

You meet yourself coming the other way. Not a reflection, but another you. One who made different choices, walked different paths. In your lucid dream, all versions of yourself exist. Greet this other self. No words are needed. They understand everything about you because they are you.

Together, explore this mirrored realm. Walk through forests where trees grow upside down. Watch birds swim through the air, fish fly on invisible currents. The rules here are different. In lucid dreams, you can accept impossible physics. They make perfect sense once you stop resisting.

Come to a city built of reflections. Each building is a captured moment, a frozen possibility. Here is a tower made of all your proudest achievements. There is a garden growing all the kindnesses you've shown. In your lucid dream, you can see your life rendered in architecture.

[PAUSE]

The city has no shadows. Light comes from everywhere. You walk through streets paved with memories, squares decorated with dreams. Other selves live here too. Every choice you ever made created another you. They wave from windows, call greetings. None are jealous. All are grateful for the experiences you've given them.

Visit some of these other selves. One who took the job you turned down. One who said yes when you said no. One who stayed when you left. In your lucid dream, you can experience their lives briefly, feel what they feel. Every path leads somewhere meaningful.

A mirror appears before you. Look into it and see not one reflection but thousands. All the versions of yourself that exist across infinite possibilities. They look back with love. You are their origin. They are your branches. In this moment, you are all of them.

[PAUSE]

Reach toward the mirror. They reach back. Your fingers touch, and you are all of them, experiencing all possible lives simultaneously. It is overwhelming and peaceful at once. You contain multitudes. You always have.

Your other self from the beginning reappears, taking your hand. They lead you to the edge of the mirror world, to a boundary where everything becomes soft and undefined. Beyond lies the infinite, the unmade, the potential that has not yet chosen its form.

You understand now. The mirror world is not a place but a process. It is what happens when consciousness looks at itself. Every question creates a world. Every thought spawns a reality. In your lucid dreams, you create universes.

[PAUSE]

Before you return, your other self gives you a gift. A small mirror that shows not reflections but possibilities. Whenever you doubt yourself, look into this mirror. See who you could be. Know that those versions are real, living their lives in their own mirror worlds.

Step back through the original mirror. Your own reality waits, but it feels different now. You see potential everywhere, possibilities shimmering at the edges of every choice.

When you wake, look for mirrors in your dreams. Mirrors that show other worlds. When you see them, remember: I am dreaming. Step through. The mirror world will welcome you, ready to show you the infinite versions of yourself.`,
  },
  {
    title: 'Temple of Moonlight',
    music: 'ambient',
    content: `Silver light floods the ancient courtyard as you approach the temple. The moon hangs enormous in the sky, closer than it has ever seemed. Look at your hands in the moonlight. See how they glow silver? This is your sign. You are dreaming. You are aware. The temple has been waiting for you.

The temple seems carved from solidified moonbeam. Its surfaces are smooth and luminous. You feel expected, welcomed, guided toward its open doors. In lucid dreams, sacred spaces recognize aware dreamers. You are honored here.

Inside, light flows like water, pooling in corners, streaming through arched windows. Monks made of silver shadow move silently about their duties. They nod acknowledgment as you pass. They have kept this temple for centuries beyond counting, waiting for dreamers like you.

[PAUSE]

The main hall holds a great reflecting pool, perfectly still, perfectly circular. The moon's reflection floats on its surface. Here, the reflection is clearer than the moon itself. In your lucid dream, reflections can be more real than originals. Gaze into the water.

See yourself as you were. As you are. As you could become. The moon shows no judgment, only observation. It has witnessed all of human history. It has learned to love without condition. Let it love you now.

A monk approaches and offers you a cup of light. Drink. The moonlight fills you, cool and cleansing. It washes through your thoughts, illuminating forgotten corners. In your lucid dream, light can cleanse what water cannot reach.

[PAUSE]

The monk guides you to a smaller chamber where moonlight falls through a lens, concentrated into a single brilliant point. Place your hand in the beam. The light passes through your flesh as if it were glass, revealing the luminous structure beneath your skin. You are made of light. All beings are made of light.

Moon phases are represented as doorways. Each leads to a different experience. Choose the full moon and step through into pure brilliance. Here, everything is visible, everything is known. There are no secrets, no shadows, only complete understanding.

Rest in the full moon's light. Let it fill you to overflowing. Questions dissolve, not because they are answered but because they no longer matter. In the presence of such completeness, worry becomes irrelevant. Fear becomes impossible.

[PAUSE]

Visit other phases. The new moon chamber holds beautiful darkness, the potential before manifestation. The waxing moon represents growth. The waning moon teaches release. You are like the moon, constantly changing yet always yourself.

Climb the highest tower. Emerge onto a platform that floats in space. The moon fills half the sky, close enough to touch. Reach toward it. In your lucid dream, impossibilities become natural. Feel your hand sink into moonlight.

The sensation is indescribable: cool fire, liquid radiance, concentrated serenity. Pull your hand back and find it glowing. The moonlight clings to you now. You are marked, though the mark is invisible to ordinary sight. You are one of the moon's dreamers now.

[PAUSE]

Dawn approaches and the temple begins to shift. Not disappearing, just becoming less visible. The monks bow farewell. They will be here tomorrow night, and all nights to come.

The moonlight within you does not fade with dawn. It has found a permanent home in your heart. A small temple of its own where it can shine even at noon.

When you wake, look for moonlight in your dreams. Temples that glow silver. Moons that are too close, too large, too bright. When you see them, remember: I am dreaming. And the Temple of Moonlight will welcome you back, its doors always open to aware dreamers.`,
  },
  {
    title: 'River of Dreams',
    music: 'nature',
    content: `The river flows through a landscape that changes as you watch. One moment its banks are lined with willows, the next with crystal formations, the next with clouds themselves. Look at the water. See how it sparkles with colors that don't exist in waking life? You are dreaming. You are aware. The river has been waiting for you.

Your boat is made of leaves woven together by hands you cannot see. It requires no steering. The river knows where you need to go. In lucid dreams, you can trust such knowing. Lie back against a cushion of moss and let the current take you.

The water below is clear as air. You can see to incredible depths. Fish made of light swim through forests of swaying weeds. Some of the fish are memories, swimming free. In your lucid dream, memories can take visible form. Recognize them as they flash silver past your boat.

[PAUSE]

On the banks, figures wave as you pass. Some are people you know, appearing as they did in your happiest moments. Others are strangers who feel familiar. In dreams, all consciousness is connected. Wave back. Send them love across the water.

The river enters a canyon of rainbow stone. The water picks up speed. Feel excitement building, but no fear. In your lucid dream, the river would never hurt you. The river loves you. Let it carry you through the rushing colors.

Emerge into a vast lake where the river pauses to rest. The surface is so still it perfectly reflects the sky. You float in infinite space. Stars appear above and below. In your lucid dream, which stars are real? Both. Neither. It doesn't matter. Enjoy the infinity.

[PAUSE]

An island rises from the lake's center. Your leaf boat carries you there. Step onto soft grass that feels like walking on kindness. In lucid dreams, the ground itself can communicate feelings. What is this island telling you?

At the island's heart, find a pool fed by a small waterfall. This water is different, thicker, more luminous. This is where the river originates. The source of dreams. The spring from which all night visions flow.

Cup your hands and drink. The water tastes of starlight and childhood mornings and being truly understood. In your lucid dream, water can carry complex experiences. Feel memories surface, playing across your mind like fish.

[PAUSE]

The pool shows you the future. Not specific events, but feelings. A sense of purpose. A feeling of belonging. The certainty that good things are coming. In lucid dreams, the future is not fixed but felt. Trust what the water shows you.

Rest on the island until you feel ready. The leaf boat waits patiently. In your lucid dream, you have all the time you need.

The river carries you through scenes from your own life. Moments frozen in time but alive when you look at them. You don't have to relive anything. Just witness. Just appreciate. The river preserves all moments, keeping them safe.

[PAUSE]

The river forks. One branch flows toward light, the other toward comfortable shadow. Neither is wrong. In your lucid dream, you can choose, or you can let the boat choose. Trust the journey either way.

You drift into a dream within the dream. Sleep on the river is the deepest sleep of all. In this innermost dream, you find the river's heart. It is not a place but a feeling. All rivers are this river. All dreams are this dream. All dreamers are connected.

When you wake on the boat, the river is carrying you toward dawn. You have traveled far. You are not the same person who lay down hours ago. The river has washed you clean, not of your experiences but of your resistance to them.

When you wake fully, look for rivers in your dreams. Rivers that change their banks. Rivers that glow. When you see them, remember: I am dreaming. And the River of Dreams will carry you home.`,
  },
  {
    title: 'The Dreaming Library',
    music: 'piano',
    content: `The library extends further than eyes can follow. Shelves rise into mist. The books themselves emit soft light. Look at your hands in the book-glow. See how the light plays across your skin? You are dreaming. You are aware. Welcome to the Dreaming Library.

A librarian approaches, their form shifting like a figure seen through water. They do not ask what you seek. They somehow know your heart's question before you've formed it. In lucid dreams, such knowing is natural. Trust their guidance.

The aisle they lead you through contains books bound in materials you cannot identify. Some feel like solidified thought. Others are wrapped in emotion made tangible. The spines bear titles you don't recognize yet somehow understand. In lucid dreams, you can read any language.

[PAUSE]

You are drawn to one book. Its cover is the exact shade of your favorite color. The librarian nods approval. In your lucid dream, attraction to objects has meaning. Trust what draws you.

Inside are not words but experiences. Touch a page and suddenly you are standing on a cliff above a sunset sea. You are not just seeing it but being there. This is what dream books offer: direct experience. Close it and feel the sunset fade.

Open another. Swim with dolphins in a phosphorescent sea. Another: walk through a forest after rain. Each page is a sanctuary, a gift from someone who experienced something beautiful and wanted to share.

[PAUSE]

Find a section where books contain futures. Not predictions but possibilities. Open one and see yourself five years hence, happy in ways you cannot currently imagine. In your lucid dream, the future is not fixed. Every possibility exists until it becomes reality.

Another section holds the books of others. People you have loved. People you have not yet met. Their stories are here. Touch a spine of someone dear to you and feel their joys and sorrows. In lucid dreams, empathy becomes direct experience.

The library has no judgmental books. No tomes of shame. Those are kept in personal libraries only the owner can access. Here, there is only wonder, only wisdom, only love made readable.

[PAUSE]

Find a book that appears blank. The librarian explains: this is yours. You are writing it with every moment of your life. One day it will sit on these shelves, waiting to share your experiences with seekers yet unborn. In your lucid dream, you glimpse your own legacy.

A reading nook appears. Comfortable chairs, soft light, a cup of something warm. In lucid dreams, the environment responds to your needs. Settle in and read whatever calls to you.

Other readers drift through the aisles. Some human, some not. The library welcomes all conscious beings. Exchange silent greetings. You are all part of the same dream, the same search for understanding.

[PAUSE]

The librarian offers you a card. Not a library card but a piece of the library itself. With this, you can return whenever you wish. The library is always open. The books are always waiting.

As you prepare to leave, look around one more time. Remember the shelves that rise into mist. Remember the light the books emit. Remember the librarian who knew your questions.

When you wake, look for libraries in your dreams. Endless shelves. Glowing books. When you see them, remember: I am dreaming. And the Dreaming Library will welcome you back, ready to show you whatever you need to know.`,
  },
  {
    title: 'Garden of Forgotten Seasons',
    music: 'nature',
    content: `You step through an archway of flowering vines into a garden where all seasons exist at once. To your left, cherry blossoms fall in endless spring. Ahead, summer sun warms a meadow. To your right, autumn leaves spiral in gold. Beyond, winter silence blankets everything in peaceful white.

Look at your hands. See how the light changes as you turn them, spring light to summer light to autumn to winter? This is how you know. You are dreaming. You are aware. This impossible garden welcomes you.

The boundaries between seasons are soft, permeable. Walk from summer to winter in a dozen steps. Feel the temperature change like walking through curtains of air. In your lucid dream, you can experience all seasons at once. No need to choose.

[PAUSE]

Begin in spring. Watch flowers unfold as you observe them. Butterflies emerge from chrysalises. Everything is beginning, everything is possible. In your lucid dream, spring represents new starts available to you right now.

Walk into summer. The warmth wraps around you like an embrace. Lie in deep grass and watch clouds. In your lucid dream, time stretches to fill exactly how long you want to stay. There is no rush.

Enter autumn. The leaves are not dying but celebrating, showing their hidden colors. Walk through drifts of gold, releasing their sweet, earthy scent. In your lucid dream, autumn teaches that letting go can be beautiful.

[PAUSE]

Cross into winter. The chill is refreshing, not cold. Snow falls in lazy flakes that seem to dance. The silence is profound but not empty. In your lucid dream, winter represents rest, gathering strength for what comes next.

At the garden's center, where all seasons meet, stands a great tree. It is flowering and fruiting and dropping leaves and bare all at once. Sit beneath it. Feel all seasons flowing through you simultaneously.

This is what life is like. Not one season but all seasons, constantly shifting. In your lucid dream, you can feel this truth directly. Spring's hope, summer's joy, autumn's release, winter's rest. All present in every moment.

[PAUSE]

The tree offers fruit from its summer branch. Taste abundance. A flower from spring. Smell possibility. A leaf from autumn. Feel the beauty of letting go. A snowflake from winter. Experience peace.

Other visitors move through the garden. An elderly figure in spring, remembering youth. A child in summer, at home in joy. Someone in winter, finding rest. In your lucid dream, all ages of life are honored.

A gardener appears. They have tended this place since time began. They plant spring seeds, tend summer growth, harvest autumn bounty, guard winter sleep. They invite you to plant something. Choose a seed that represents something you hope for. Place it in spring soil.

[PAUSE]

The gardener covers the seed. It will grow, they promise. Everything grows here, in its own time, in its own season. In your lucid dream, you can trust that your hopes will bloom.

The garden offers a gift. A small vial containing a drop of rain from each season. Spring rain for new beginnings. Summer rain for growth. Autumn rain for wisdom. Winter snow-melt for rest. Carry them with you.

When you wake, look for impossible gardens in your dreams. Places where seasons mix. When you see them, remember: I am dreaming. And the Garden of Forgotten Seasons will welcome you back, ready to show you the eternal cycle of growth.`,
  },
  {
    title: 'The Lighthouse at World\'s End',
    music: 'ambient',
    content: `The lighthouse stands at the edge of everything. The sea meets the sky meets the end of the known world. Its beam sweeps through eternal twilight, guiding dreamers home. Look at the light. See how it illuminates your hands each time it passes? You are dreaming. You are aware. You have found the edge.

Climb the spiral stairs. Each step brings you closer to the light. In your lucid dream, climbing represents progress, elevation, expanded perspective. Feel your awareness grow with each step.

The lighthouse keeper greets you at the top. A figure made of patience and solitude and profound peace. They have kept this light burning since before there were eyes to see it. In your lucid dream, you meet the part of yourself that guides you even when you don't know you're being guided.

[PAUSE]

From the gallery, you can see everything. Behind you, familiar lands fading into distance. Before you, the unknown, stretching to infinity. The lighthouse stands at the boundary, belonging to both worlds and neither. In lucid dreams, you too can exist between worlds.

The keeper shows you the light itself. Not fire but something older. Something that was light before light existed. It burns without consuming, illuminates without revealing too much. Its purpose is to remind dreamers that home exists, no matter how far they wander.

Ask the keeper what lies beyond the edge. They smile. Different dreamers see different things. For some, it is beginning. For others, ending. For a few, it is continuation. In your lucid dream, you can choose what the edge means for you.

[PAUSE]

Spend time at the great windows. The view shifts as you watch. Sometimes clouds of possibility. Sometimes faces of those you've lost, not trapped but transformed. Sometimes yourself, reflected in infinite distance. In lucid dreams, the edge shows you what you need to see.

The lighthouse has hidden rooms. A library of dreamers' journals. A kitchen that produces whatever your soul needs. A bedroom with views of unborn stars. This is not a brief visit. In your lucid dream, you can stay and rest, truly rest.

At night, help the keeper tend the light. It needs no fuel, only attention. Someone must watch it, must believe in it. Tonight, that someone is you. In your lucid dream, you become the lighthouse for a time.

[PAUSE]

Send thoughts out into the darkness. Messages for those who are lost. The light carries your thoughts, translating them into frequencies all beings can receive. In lucid dreams, you can help others, even strangers, even across vast distances.

Dawn comes. The light seems brighter for your attention. The keeper nods approval. You have kept faith with the light. A bond exists now that cannot be broken.

The keeper offers you a gift. A fragment of the lighthouse light, small enough to carry. It will glow when you are lost, growing brighter as you approach where you need to be. In your lucid dream, you receive a compass that points toward your true self.

[PAUSE]

Descend the stairs. But the lighthouse has changed you. You understand now that you are not just a traveler but a guide. Everyone who carries the light becomes a lighthouse themselves.

When you wake, look for lighthouses in your dreams. Beams sweeping through darkness. Towers at the edge of everything. When you see them, remember: I am dreaming. And the lighthouse will welcome you back, ready to show you the boundary between known and unknown.`,
  },
  {
    title: 'Symphony of the Spheres',
    music: 'cosmic',
    content: `The music begins before you can identify its source. It seems to come from the fabric of space itself. You realize you are floating in a vast concert hall made of stars. Look at your hands. See how they vibrate slightly with the music? You are dreaming. You are aware. The universe is playing for you.

Each planet has its own voice. Mercury sings quick, precise tones. Venus hums deep and warm. Earth offers harmonies of water and wind. Mars beats like a distant drum. In your lucid dream, you can hear what ancient astronomers only imagined.

The gas giants provide bass notes. Jupiter rumbles with enormous majesty. Saturn's rings shimmer with overtones. Uranus and Neptune sound from the cold distance, ethereal and mysterious. In your lucid dream, scale is not a barrier. You can hear across billions of miles.

[PAUSE]

The moons join in. Europa's crackle of ice. Titan's methane whisper. Your moon singing the tides. Dozens of voices, hundreds, each adding their own note. In lucid dreams, you can perceive the full orchestra of the solar system.

The sun conducts it all. Its magnetic storms wave like a baton. It has been conducting this symphony since the solar system formed. In your lucid dream, you witness the longest performance in history.

Float closer to the music. Feel it vibrate through your form. The sound is not just heard but felt, absorbed. You are becoming an instrument yourself, resonating in sympathy. In lucid dreams, you can become part of what you experience.

[PAUSE]

Other listeners float nearby. Beings from worlds you cannot imagine. You share the experience, each feeling the symphony in your own way. In lucid dreams, music transcends all boundaries.

A passage begins that is specifically for you. The universe composed this movement in your honor. It tells your life in sound, from first breath to this moment. Let tears float from your eyes like diamonds. Each one sings its own small song.

The symphony shows you how you fit into the cosmic composition. Your life is one phrase in an eternal song, brief but essential. In your lucid dream, you understand your place in everything.

[PAUSE]

A crescendo builds. All planets singing at once. All moons. All asteroids. All comets. The volume should be overwhelming but instead it is clarifying. You see patterns you never noticed. Everything relates to everything else.

Then silence. Not absence of music but music's pause. The rest that makes rhythm possible. In the silence you hear the music still, echoing in memory. In lucid dreams, silence and sound are equally meaningful.

The symphony resumes, gentler now. A lullaby for the ages. You forget you ever existed separately from the music. You are the planets. You are the stars. You are the song itself.

[PAUSE]

You understand why the ancients spoke of the music of the spheres. They heard it too, in their own dreams. The universe has always been singing. It takes dreamers to hear it.

When you wake, listen differently. Every sound will hold echoes of cosmic music. Wind will sing of Neptune. Laughter will ring with Jupiter's joy. In your lucid dreams, you have heard the symphony. You will never unhear it.

Look for music in your dreams. Sounds that seem to come from everywhere. Harmonies too complex for earthly instruments. When you hear them, remember: I am dreaming. And the Symphony of the Spheres will play for you again.`,
  },
  {
    title: 'The Memory Palace',
    music: 'piano',
    content: `The palace rises before you, built from moments rather than stone. Its walls are made of first kisses and last goodbyes. Its towers are triumphs. Its foundations are lessons learned. Look at your hands against this architecture. See how memories shimmer around your fingers? You are dreaming. You are aware. This is your palace.

The great doors open, recognizing you as the creator of all they contain. Step into a vast entrance hall where chandeliers sparkle with every moment you ever noticed beauty. In your lucid dream, your accumulated wonder hangs here for you to enjoy again.

A guide appears. A version of yourself from a peaceful future, here to help you navigate. They take your hand. In lucid dreams, you can meet aspects of yourself. This one knows the way.

[PAUSE]

Choose where to begin. The room of childhood opens, and suddenly you are there. Not just remembering but re-living. Here is the first time you laughed. Here is learning to walk. Here is the first friend. In your lucid dream, the past is not gone. It lives here.

The memories respond to your attention. You see the love in your parents' eyes that you were too young to recognize then. You understand the patience of teachers you took for granted. In lucid dreams, you can see your life from new perspectives.

Enter the room of accomplishments. All your victories, from smallest to largest. Learning to tie your shoes stands next to greater achievements. In your lucid dream, the palace makes no distinction between public and private success. All are treasured.

[PAUSE]

Your guide asks if you are ready for the difficult rooms. You say yes. Enter the hall of losses. But something surprising has happened. Time has transformed them. The pain remains but is wrapped in understanding, softened by perspective. In lucid dreams, difficult memories can heal.

The palace is not just storage but transformation. Every memory that enters is processed, placed in context. Difficult memories become teachers. Joyful memories become anchors. In your lucid dream, you see how your mind preserves and integrates experience.

A wing is devoted to people you have loved. Each has their own room decorated with every moment you shared. In your lucid dream, you can visit them whenever you wish. Not to haunt the past but to honor it.

[PAUSE]

See rooms still being built. These are future memories. Every day adds new material. The palace will never be complete because your life is not complete. In your lucid dream, you glimpse the architecture of your ongoing existence.

In the deepest chamber, find a pool of still water. This is the source of all memories. Look in and see not just your memories but the memories of all beings. All connected. All part of one vast remembering.

Memory is not just personal but cosmic. Your palace is a room in a larger structure. Your memories contribute to existence's record of itself. In your lucid dream, you understand your place in the universal memory.

[PAUSE]

The pool offers to show you any moment from all of time. But you choose something small: yourself as a child, falling asleep after a perfect day, safe and warm. In lucid dreams, simple memories can be the most profound.

Your guide gives you a key. With this, you can return whenever you wish. The palace is always here. Your memories are safe. In your lucid dream, you receive permanent access to your own depths.

When you wake, look for palaces in your dreams. Buildings made of memories. Rooms that contain your life. When you see them, remember: I am dreaming. And the Memory Palace will welcome you back, ready to show you who you have been and who you might become.`,
  },
  {
    title: 'The Weaver\'s Workshop',
    music: 'ambient',
    content: `The loom stands at the center of everything. Enormous and ancient. Its threads stretch to infinity in all directions. Look at the threads. See how some of them are the same color as your hands? You are woven into this tapestry. You are dreaming. You are aware. Welcome to where reality is made.

The Weaver sits at the heart, fingers moving too fast to see. Their eyes hold the pattern of all existence. Their smile welcomes you. In lucid dreams, you can meet the forces that shape reality. The Weaver has been waiting for you.

Approach slowly. The threads are not just threads but lives. Each one unique, distinct. They cross and merge and separate. The fabric they produce is the universe itself. In your lucid dream, you see how everything connects to everything.

[PAUSE]

Watch the Weaver work. Their hands move with perfect confidence, choosing each intersection. But there is no forcing. The threads have their own desires. The Weaver works with them, not against them. In lucid dreams, you can witness collaboration at the cosmic level.

The Weaver shows you your thread. A color you have no name for, shifting between shades. Beautiful in ways that make your heart ache. This is you. This is how you appear in the grand design. In your lucid dream, you see yourself from the Weaver's perspective.

Follow your thread backward. See all the moments of your life, each one a point where your thread crossed another. Parents. Friends. Strangers who affected you without knowing. In lucid dreams, you can trace the connections that made you.

[PAUSE]

Follow your thread forward. Into regions not yet woven. Some crossings are fixed, some flexible. Your choices will influence which threads you meet. In your lucid dream, you glimpse the interplay of fate and free will.

The Weaver offers to let you try. Feel the tension in the threads. Make one crossing, one small intersection. Feel the entire loom vibrate with your choice. In lucid dreams, you can participate in the weaving of reality.

Every decision ripples outward, the Weaver shows you. Every action changes the pattern. This is responsibility. This is power. This is life. In your lucid dream, you understand the weight and privilege of choice.

[PAUSE]

Other apprentices work at smaller looms. Some weave personal tapestries. Others weave collaborative pieces. The workshop hums with creation. In your lucid dream, you are among creators.

The Weaver shows you where new threads are born. A pool of pure potential from which colors emerge that have never existed. Every new soul draws a thread, adding to the infinite palette. In your lucid dream, you see the moment of creation.

The Weaver gives you a gift. A small shuttle, sized for human hands. With this, you can consciously participate in the weaving of your life. In your lucid dream, you receive a tool for intentional living.

[PAUSE]

You are no longer just a thread but a weaver. Co-creator of existence. The responsibility is immense but not crushing. The Weaver trusts you. In lucid dreams, you can accept this trust.

Look back at the great loom. Your thread shimmers in its place. Connected to countless others. Contributing to patterns both local and cosmic. In your lucid dream, you see your significance.

When you wake, look for looms in your dreams. Threads that stretch to infinity. Patterns being woven. When you see them, remember: I am dreaming. And the Weaver's Workshop will welcome you back, ready to show you the fabric of existence.`,
  },
  {
    title: 'The Hall of Inner Mirrors',
    music: 'piano',
    content: `You stand in a circular hall surrounded by mirrors. But these are not ordinary mirrors. Each shows a different version of you. The you who is brave. The you who is kind. The you who creates. Look at all these reflections. In waking life, you see only one self. Here, you see the truth. You are dreaming. You are aware. You are many.

The first mirror shows your strength. Not physical strength, but the strength that carried you through difficult days. See yourself surviving what you thought you couldn't survive. See yourself getting up when everything said stay down. In your lucid dream, witness your own resilience.

Move to the next mirror. Your kindness reflected back. Every small act of compassion plays across its surface. The help you gave when no one was watching. In your lucid dream, see how much kindness you have given.

[PAUSE]

A mirror shows your creativity. Not just art, but the creativity of problem-solving, of finding new paths when old ones closed. You are more creative than you know. In your lucid dream, the evidence is undeniable.

Another mirror: your resilience. All the times you bent without breaking. All the storms you weathered. All the setbacks that became comebacks. In your lucid dream, feel honest pride in what you've survived.

These mirrors show truths you've forgotten. The voice of doubt has been loud, drowning out the quieter voice that knows your worth. But here, the truth is undeniable. You are remarkable. You are enough. In your lucid dream, let this knowing settle into your bones.

[PAUSE]

A mirror of love. Not just romantic love, but all love. The love you've given to family and friends. The love you've shown to strangers. And something else: the love you deserve to receive. In your lucid dream, see your capacity for love in all directions.

The mirror of wisdom shows lessons learned. Each mistake transformed into understanding. Each failure alchemized into growth. You are wiser than you were. In your lucid dream, acknowledge your accumulated wisdom.

A mirror of joy reflects your capacity for happiness. Moments of pure delight. Laughter that surprised you. Quiet contentment. Joy is not foreign to you. In your lucid dream, see how naturally it belongs to you.

[PAUSE]

A dark mirror at first. Your shadow, the parts you've hidden or rejected. But light seeps in around the edges. Even your shadow has purpose. Even your flaws contributed to who you are. In your lucid dream, integrate what you've denied.

At the center stands the largest mirror. It shows you complete. All aspects unified. This is who you really are: not the doubts, not the fears. The sum of all mirrors is extraordinary. In your lucid dream, meet your whole self.

Touch the central mirror. It's warm, alive. It tells you that you were never broken. The work you do on yourself is valuable but not because you need fixing. You are polishing what was always precious. In your lucid dream, receive this truth.

[PAUSE]

The hall begins to rotate. All mirrors spinning like a carousel. Strength, kindness, creativity, resilience, love, wisdom, joy, shadow. They blur into a single stream of light. That light is you. In your lucid dream, experience your own luminosity.

Each mirror offers a gift. Strength: an ember that will never go out. Kindness: a warmth that spreads. Creativity: a spark of infinite possibility. In your lucid dream, gather what is already yours.

When you wake, look for mirrors in your dreams. Mirrors that show many selves. When you see them, remember: I am dreaming. And the Hall of Inner Mirrors will welcome you back, ready to show you all that you are.`,
  },
  {
    title: 'The Healing Springs',
    music: 'nature',
    content: `The path leads downward through ancient forest, toward the sound of water that calls your name. With each step, the weight you carry becomes visible. You are here to set it down. Look at your hands. See how they already glow with anticipation? You are dreaming. You are aware. Healing awaits.

The springs reveal themselves gradually. Wisps of steam. The mineral scent of deep earth. A series of pools carved into the mountainside, each glowing with its own light. In your lucid dream, these waters are remedy made liquid.

The first pool is for physical healing. Its waters glow pale green. Step in. Feel the warmth penetrate deeper than ordinary heat could reach. In your lucid dream, the water finds knots you forgot you had. One by one, they release.

[PAUSE]

Float, supported completely. The water continues its work. It knows your body better than you do. In lucid dreams, healing does not require understanding. Trust the process. Receive.

Move to the second pool. Soft blue, for healing the mind. All the thoughts that have been too loud. All the worries that have cycled endlessly. Sink into the blue and feel your thoughts slow. In your lucid dream, discover the still lake that was always there, just covered by waves.

The third pool glows soft gold. Emotional healing. Feelings you've suppressed. Grief you've postponed. Joy you've been afraid to fully feel. In your lucid dream, this pool creates safety for emotions to move through you as they were meant to.

[PAUSE]

Enter the golden water and feel permission. You can feel here. All of it. What comes may surprise you. Tears. Laughter. Both at once. In your lucid dream, emotions are not problems but experiences to be honored.

The fourth pool glows white. Healing of spirit. The deep essence of who you are. Feel boundaries dissolving. Not your identity, but the walls around it. In your lucid dream, sense your connection to all life.

At the center sits a final spring. All colors shift through it: green, blue, gold, white, and colors with no name. This is complete healing. Integration of all levels. Step in and feel everything weave together.

[PAUSE]

Physical ease supports mental clarity. Mental clarity allows emotional flow. Emotional flow opens spiritual connection. Spiritual connection nourishes physical well-being. In your lucid dream, experience the cycle becoming self-sustaining.

The spring speaks in sensation. Healing is not a destination but a direction. You are not here to become perfect. You are here to become more fully yourself. In your lucid dream, receive this wisdom.

Stay until you feel complete for now. Not finished, because healing is ongoing, but complete for this moment. In your lucid dream, you have received what you came for.

[PAUSE]

Emerge from the water changed. Lighter but not fragile. Softer but not weak. The springs have given you a new relationship with your own healing. In your lucid dream, you are not broken seeking repair. You are whole seeking growth.

The path back up feels easier. Not because it changed but because you did. The springs live within you now: their warmth, their wisdom, their endless capacity for renewal.

When you wake, look for healing waters in your dreams. Pools that glow. Springs that call your name. When you see them, remember: I am dreaming. And the Healing Springs will welcome you back whenever you need to heal.`,
  },
  {
    title: 'The Garden of Letting Go',
    music: 'ambient',
    content: `The garden gate stands open, inviting you into a space where release is possible. Not forced, not demanded, but allowed. Look at your hands on the gate. See how they already feel lighter? You are dreaming. You are aware. You are ready to let go.

The path is lined with flowers in impossible colors. Each bloom represents something someone released here. Old grudges become roses. Past regrets become lilies. The garden transforms what is released into beauty. In your lucid dream, nothing is wasted.

A guide made of light and patience appears. They ask without words: What have you brought to release today? In your lucid dream, you already know the answer. Things you've carried too long. Things that no longer serve.

[PAUSE]

The first station is a pool of still water. Here you release resentments. Think of someone you've held a grudge against. Their face appears in the water. Releasing resentment doesn't mean what happened was okay. It means you're no longer willing to carry the poison. In your lucid dream, forgiveness is for you.

Breathe out. Something dark leaves your body. It enters the water and dissolves. The weight lifts. Not completely, perhaps not yet, but significantly. In lucid dreams, letting go is a practice. You have just practiced.

A tree whose branches reach toward heaven. Here you release old beliefs about yourself. Beliefs you absorbed as a child. Beliefs that once protected you but now confine. In your lucid dream, name one: I am not enough. I don't deserve. I am alone.

[PAUSE]

Speak the belief and watch it become a leaf that floats to the tree. The tree transforms it into something new. The belief doesn't disappear, but its grip loosens. In your lucid dream, feel more space inside yourself.

A bower of vines creates an alcove for grief. Grief for what you've lost. What never was. What cannot be. Releasing grief doesn't mean forgetting. It means allowing grief to move through instead of taking up permanent residence. In your lucid dream, let yourself feel the losses.

The vines absorb some of the weight. You don't feel empty when you're done. You feel lighter but still full of love. In lucid dreams, grief and love can coexist.

[PAUSE]

A fire pit for releasing fear. Not useful fear that keeps you safe, but fears that keep you small. Identify one and watch it take shape: a shadow creature at your feet.

Guide the fear toward the flames. Not forcing but inviting. It changes in the fire. Fear becomes energy. In your lucid dream, understand: fear and excitement are close cousins. Transform one into the other.

A stream for regret. Choices you wish you'd made differently. Words you wish you'd said or not said. Think of your biggest regret and watch it become a stone in your hand.

[PAUSE]

Throw the stone into the stream. It floats, carried toward a distant sea. Your past choices made you who you are today. In your lucid dream, honor the lessons while releasing the weight.

At the garden's heart, an empty basket. Examine what else you're carrying. Old identities. Outdated expectations. Anything that weighs more than it's worth. In your lucid dream, name each thing and place it in the basket.

The basket glows as it fills. Released things become nutrients for new growth. In releasing, you create space for what wants to come next. In your lucid dream, feel the liberation of emptying.

[PAUSE]

Rest and integrate. Where there was heaviness, there is now possibility. Where there was stagnation, there is now flow. In your lucid dream, you haven't lost anything needed. Only what was in the way.

The garden offers a gift: a single seed. Whatever wants to grow in the space you've created. Plant it. Tend it. Trust it. In your lucid dream, what you've released becomes soil for new life.

When you wake, look for gardens of release in your dreams. Gates that stand open. Flowers made from transformed burdens. When you see them, remember: I am dreaming. And the Garden of Letting Go will welcome you whenever you need to set something down.`,
  },
  {
    title: 'The Mountain of Clarity',
    music: 'binaural',
    content: `The mountain rises before you, its peak hidden in clouds that pulse with soft light. This is not a mountain to conquer but to listen to. Each step upward brings greater clarity. Look at your hands. See how they sharpen into focus as you begin to climb? You are dreaming. You are aware. Clarity awaits.

The trail is well-worn by countless seekers. They climbed for the same reasons you climb: to think more clearly, to see more truly. In your lucid dream, you join a tradition as old as consciousness itself.

The lower slopes are thick with fog. Mental clutter of daily life. So many thoughts competing for attention. In your lucid dream, the fog is not malicious. It's just dense. Walk through it. It will thin.

[PAUSE]

As you climb, the fog gives way. With each step, one unnecessary thought falls away. Not important thoughts, but mental noise. The worries about things you cannot control. The replaying of old conversations. In your lucid dream, feel your mind lighten.

A meadow offers rest. Sit and observe your thoughts without engaging them. Watch your mind as if watching clouds pass. There goes a worry. There goes a judgment. In your lucid dream, create distance from the constant stream.

The meadow teaches: you are not your thoughts. You are the awareness in which thoughts arise. This awareness is always clear, always peaceful. In lucid dreams, you can experience this truth directly.

[PAUSE]

Continue climbing. The air grows thinner but your thinking grows sharper. Problems that seemed intractable begin to reveal solutions. Not because anything changed, but because you can see more clearly. In your lucid dream, clarity is not about more information. It's about seeing what's already there.

A cave offers shelter and deeper teaching. The walls glow with soft phosphorescence. Sit and feel your mind settle into profound stillness. In your lucid dream, discover what stillness really feels like: not emptiness but quiet fullness.

The cave teaches about mental energy. How it's depleted by unnecessary thoughts and conserved by discipline. In your lucid dream, feel how much more energy a clear mind has.

[PAUSE]

Learn techniques. How to notice unhelpful thought patterns. How to gently redirect attention. How to create space between stimulus and response. In lucid dreams, these skills can be practiced directly.

Near the summit, a wise figure sits beside the path. Made of mountain stone and sky light. They communicate without words. Clarity is your natural state. The fog is learned, habitual. In your lucid dream, receive this teaching.

The summit is a plateau, vast and open. Here the air is perfectly clear. You can see in all directions, across impossible distances. In your lucid dream, this is what a clear mind feels like: expansive, unlimited.

[PAUSE]

Think about problems in your life from here. They look different. Not smaller, but clearer. You can see their edges, their causes, their solutions. In your lucid dream, perspective is a form of wisdom.

The mountain offers a gift: a small crystal, perfectly clear. When confusion clouds your mind, hold this crystal and remember. In your lucid dream, you receive an anchor for clarity.

The descent is faster but you maintain what you gained. The fog returns below, but you move through it differently. You know clear sky exists above. In your lucid dream, you carry certainty.

When you wake, look for mountains in your dreams. Peaks that rise above fog. Clarity that increases with altitude. When you see them, remember: I am dreaming. And the Mountain of Clarity will welcome you back whenever you need to see clearly.`,
  },
  {
    title: 'The Sanctuary of Rest',
    music: 'ambient',
    content: `You have traveled far to reach this place. With each step toward the sanctuary, you left behind one more responsibility, one more demand. Look at your hands. See how the tension is already leaving them? You are dreaming. You are aware. You are ready to rest.

The sanctuary is built from materials that radiate peace. Walls of soft cloud. Floors of warm sand. Ceilings that open to gentle starlight. Nothing here requires your attention. In your lucid dream, you are free to simply be.

A guide made of stillness shows you to your space. It is perfect for your needs. The right temperature. The right softness. The right light. In lucid dreams, the environment responds to unspoken needs. Sink into comfort designed specifically for you.

[PAUSE]

Rest is not laziness, the sanctuary whispers. Rest is not weakness. Rest is how living things regenerate. In your lucid dream, release the guilt that usually accompanies rest.

The sanctuary has rooms for different kinds of rest. Physical rest: beds that support exactly right. Mental rest: spaces so quiet that thoughts slow naturally. Emotional rest: environments so safe you can stop monitoring for threat. In your lucid dream, choose which kind you need most.

In the room of physical rest, feel your body begin to repair. Tensions you forgot you held start to release. Your nervous system switches from fight-or-flight to rest-and-digest. In lucid dreams, healing can be accelerated.

[PAUSE]

In the room of mental rest, thoughts grow slow and spacious. The urgent to-do list fades. Worries lose their sharp edges. In your lucid dream, discover the profound quiet beneath all mental noise.

In the room of emotional rest, set down the feelings you've been managing. The social masks you wear. The constant reading of others' needs. In your lucid dream, you don't have to manage anything. Just exist.

In the room of spiritual rest, remember why you're here at all. Not in the sanctuary, but in life. Beneath striving and achieving is a deeper purpose that doesn't require effort. In your lucid dream, reconnect with this purpose.

[PAUSE]

Rest is not the opposite of activity but its essential partner. The bow must unbend to be strung again. In your lucid dream, understand this truth in your body.

A meal appears when ready. Food that nourishes without requiring anything of you. In lucid dreams, even eating can be effortless.

Sleep comes when needed. Unlike any sleep you've known. No alarm to anticipate. No tasks waiting. Just deep, restorative unconsciousness. In your lucid dream, sleep within sleep is the deepest rest.

[PAUSE]

Wake feeling something forgotten: true refreshment. Not just less tired but actually restored. The sanctuary has given you back something essential. In your lucid dream, know that this restoration is real.

The sanctuary offers a gift: a small stone, smooth and warm. When you hold it, remember: rest is not earned but needed. Rest is not lazy but wise. In your lucid dream, receive permission to rest.

Walk back toward the world differently. Knowing the sanctuary exists. Knowing you can return. In your lucid dream, you have learned that taking care of yourself is essential.

When you wake, look for sanctuaries in your dreams. Places of profound rest. Spaces where nothing is demanded. When you see them, remember: I am dreaming. And the Sanctuary of Rest will welcome you whenever you need to restore.`,
  },
  {
    title: 'The Celebration of Being',
    music: 'piano',
    content: `You wake to the sound of distant music and laughter. Following the sound, you find a village square transformed into celebration. But this is no ordinary party. This is a celebration of existence itself. Look at your hands. See how they move to the music without your trying? You are dreaming. You are aware. Welcome to the joy.

Beings of all kinds are here. Some human, some not. Some made of light, some of sound. All celebrating the same thing: the extraordinary gift of being. In your lucid dream, you are welcomed not as guest but as honored participant.

The music is unlike anything you've heard. Made of joy itself. Pure, distilled joy translated into sound. Your body begins to move before you decide to dance. In lucid dreams, joy can be directly experienced, not just felt.

[PAUSE]

Dance without self-consciousness. Here there is no judgment. Everyone is too busy feeling their own joy to critique yours. In your lucid dream, this is celebration pure: not performance but expression.

A table offers food from every source. Fruits that contain summer afternoons. Bread that holds the warmth of countless hearths. In your lucid dream, food carries meaning beyond nutrition. Each bite is a tiny celebration.

Talk with beings who tell stories of their own existence. A creature made of music describes what it's like to be sound. An entity of pure color shows you what the universe looks like through eyes that see only beauty. In lucid dreams, perspective expands infinitely.

[PAUSE]

The celebration has rituals. A dance of gratitude for bodies that can move. A song of thanks for minds that can wonder. A prayer of appreciation for hearts that can love. In your lucid dream, join each ritual and feel gratitude awaken.

You've forgotten to appreciate being alive, you realize. Daily life has obscured the miracle. But here, surrounded by beings who never forgot, you remember. Every breath is extraordinary. In your lucid dream, let this truth sink in.

A being of light takes your hand. They want to show you something. A single flower, glowing softly. This flower represents your life. All experiences. All people loved. All moments of joy and sorrow. It's beautiful, they say. In your lucid dream, see your life as others see it.

[PAUSE]

From this perspective, even difficult parts contribute to beauty. Storms that shaped you. Wounds that opened you. Losses that deepened you. In your lucid dream, see how everything woven together creates something unique and precious.

The celebration reaches its peak. Everyone joins in a single sound. Not words, but pure appreciation. It resonates through your body, your mind, your spirit. In your lucid dream, you are vibrating with gratitude.

The sound fades but its effects don't. You carry the vibration as the celebration winds down. Not ending, you're told, but transitioning. Whenever anyone anywhere feels joy in being alive, the celebration continues. In your lucid dream, understand this truth.

[PAUSE]

Before leaving, receive a gift: a small chime. When rung, it reminds you to celebrate. Small acknowledgments of life's gifts. A breath appreciated. A moment savored. In your lucid dream, these small celebrations become a life of gratitude.

Walk away from the village but take the celebration with you. Every step is a tiny dance. Every breath is a quiet song. In your lucid dream, being alive is the occasion. Being conscious is the miracle.

When you wake, look for celebrations in your dreams. Music and laughter. Joy without reason. When you find them, remember: I am dreaming. And the Celebration of Being will welcome you whenever you need to remember the gift of existence.`,
  },
  {
    title: 'The Island of New Beginnings',
    music: 'nature',
    content: `The boat carries you across calm waters toward an island that wasn't on any map. It appeared when you needed it. Look at the water. See how it sparkles with colors that don't exist in waking life? You are dreaming. You are aware. A fresh start awaits.

The shore welcomes you with soft sand and flowers you've never smelled before. Everything here is new, unknown. The past does not follow you to this island. In your lucid dream, only you arrive. Essential and unencumbered.

A path leads into a forest of trees that lean toward you in welcome. They've never seen you before. They hold no preconceptions. To them, you are simply a new being, full of potential. In your lucid dream, feel what it's like to be seen without history.

[PAUSE]

Walk the path feeling lightness. The weight of history left on the shore. The stories you've told yourself about who you are have no power here. In your lucid dream, you can be anyone. You can try anything.

A clearing reveals a small village of beautiful structures. Not quite houses. More like possibilities made visible. A studio for creating. A garden for growing. A space for gathering. In your lucid dream, each represents a way you might spend your new beginning.

Inhabitants greet you. They too came seeking fresh starts. Their old identities are not forgotten but integrated. They are more than they were. In your lucid dream, see what awaits those willing to begin again.

[PAUSE]

Choose where to begin. The studio calls to creativity you've never had time for. The garden offers lessons in patience. The gathering space promises connection uncomplicated by history. In your lucid dream, all paths are open.

New beginnings don't require erasing the past, you realize. They require releasing attachment to the past. In your lucid dream, you can keep memories while letting go of the idea that past defines future.

The island has a central spring that flows with water of pure potential. Drink and feel possibilities awakening. Dreams you'd given up on. Hopes you'd buried. In your lucid dream, remember: it's never too late.

[PAUSE]

In the creative studio, make something without judgment. Feel the joy of pure creation. This is what it felt like before you learned to fear failure. In your lucid dream, create freely.

In the garden, plant seeds of intention. What do you want to grow? Health? Connection? Purpose? In your lucid dream, commit to tending what you've sown.

In the gathering space, meet others walking similar paths. Share stories not of who you were but of who you're becoming. In your lucid dream, conversations are liberating because no one knows your old story.

[PAUSE]

Night falls with unfamiliar stars. New constellations for a new life. Consider what you've found: not escape from yourself but return to yourself. The self before limiting beliefs. In your lucid dream, meet who you were always meant to be.

The island speaks in wind and wave. You don't have to stay physically. The new beginning can come with you. Every day can be this island if you let it. In your lucid dream, receive this teaching.

Morning comes. Time to return. But you're changed. The island lives within you: its potential, its permission, its promise. In your lucid dream, you are an island of new beginnings now.

When you wake, look for islands in your dreams. Shores that appear when needed. Places where the past cannot follow. When you see them, remember: I am dreaming. And the Island of New Beginnings will welcome you whenever you need to start fresh.`,
  },
  {
    title: 'The Temple of Inner Strength',
    music: 'binaural',
    content: `The temple rises from solid rock, built by forces stronger than any hand. It has stood here since consciousness first needed a place to remember its power. Look at your hands. See how they feel stronger already? You are dreaming. You are aware. Your strength awaits.

The entrance requires intention to pass through. You must want to know your strength, be ready to feel your power. In your lucid dream, set your intention and step inside.

The first chamber is the Chamber of Surviving. Its walls are lined with images of everything you've lived through. Not just dramatic challenges, but daily difficulties. Quiet battles no one saw. In your lucid dream, witness the proof: you survived all of it.

[PAUSE]

Stand in this chamber and let recognition wash over you. You are stronger than you've given yourself credit for. Here you are, still standing, still breathing. In your lucid dream, feel the irrefutable evidence of your strength.

The second chamber is the Chamber of Rising. All the times you fell and got back up. Failures that didn't destroy you. Losses that didn't end you. In your lucid dream, watch your knockdowns become comebacks.

A fire burns at the center, fed by the energy of all your risings. Add to it now. Whatever recent difficulty you've overcome. In your lucid dream, feel the fire grow brighter with your contribution.

[PAUSE]

The third chamber is the Chamber of Choosing. Difficult decisions you've made. Times you chose the harder right over the easier wrong. In your lucid dream, see your moral strength, the ability to stay true to values when it cost you.

The fourth chamber is the Chamber of Holding. Your capacity for endurance. Staying with difficulty. Holding space for pain without collapsing. In lucid dreams, sometimes strength is about standing still.

The fifth chamber is the Chamber of Asking. Asking for help is strength. Acknowledging limits is strength. In your lucid dream, honor the times you were strong enough to be vulnerable.

[PAUSE]

At the temple's heart sits a throne. Not of dominion over others, but of sovereignty over yourself. Sit. It fits perfectly. It has always been yours. In your lucid dream, take your rightful place.

From the throne, feel all strengths integrated. Physical resilience. Emotional endurance. Mental toughness. Moral courage. In your lucid dream, experience wholeness of strength.

The temple speaks from the stone: This strength is not borrowed. It was always yours. Life has been teaching you to use it. In your lucid dream, receive this truth.

[PAUSE]

Feel strength pulsing through you. Not aggression or force, but steady, available power. The power to meet what comes. To handle what must be handled. In your lucid dream, this power is yours.

The temple offers a gift: an amulet connecting you to this place. Whenever you doubt your strength, touch it and remember. In your lucid dream, receive a permanent reminder of your power.

Walk back through the chambers. Each glows with recognition as you pass. In your lucid dream, each chamber is a testament to strength you've already demonstrated.

When you wake, look for temples in your dreams. Places of power and recognition. When you see them, remember: I am dreaming. And the Temple of Inner Strength will welcome you whenever you need to remember your power.`,
  },
  {
    title: 'The River of Renewal',
    music: 'nature',
    content: `The river calls to you with the voice of moving water. Ancient and continuous. It has flowed since the world began. Everything that enters is transformed. Look at your hands in the river light. See how they already seem cleaner? You are dreaming. You are aware. Renewal awaits.

Stand on the bank watching water pass. It carries leaves and light and reflections of clouds. In your lucid dream, understand: this river can carry away what you no longer need.

Step into the current. Neither cold nor warm but somehow both. It rises to your ankles, your knees, your waist. With each inch, something old washes away. In your lucid dream, feel the residue of living begin to dissolve.

[PAUSE]

Let go of the bottom and float. The river receives you. You are carried not by effort but by the water's wisdom. In lucid dreams, you can trust the current. It knows where you need to go.

The river shows you what it has carried. Tears of joy and sorrow from countless beings. Dreams dissolved and renewed. In your lucid dream, you are joining a tradition older than memory.

The banks change as you float. Forest, meadow, sky reflected in water. The river passes through all landscapes, belongs to all of them. In your lucid dream, like the river, you are always moving, always the same in essential nature.

[PAUSE]

A pool where the river widens. Perfect stillness. Float without movement, suspended between sky and water, past and future. In your lucid dream, this is the eternal present that the river has held since time began.

Feel renewal beginning in earnest. Like cloth being rinsed clean. Like a window being washed clear. In lucid dreams, you are being returned to yourself.

The pool shows your reflection. You see yourself renewed. Tired lines softened. Weary eyes brightened. In your lucid dream, this is who you are without unnecessary burdens.

[PAUSE]

The current stirs. Let it carry you through narrows where water runs fast. Through shallows where you can touch bottom. Through deeps where unknown creatures move. In your lucid dream, the river contains all of this, fears none of it.

Learn from the river how to flow. Move around obstacles rather than fighting them. Accept the shape of banks while still going where you're going. In lucid dreams, water is the greatest teacher.

Pass through a waterfall. The falling water washes away the last of what needed releasing. Emerge gasping with joy. In your lucid dream, feel cleaner than ever. Not just physically. Essentially clean.

[PAUSE]

The river approaches a great sea. Everything that flows eventually reaches the sea. Everything in the sea eventually rises as rain, falls as river, begins again. In your lucid dream, understand the eternal cycle.

Reach the shore. You are renewed. Yourself restored. Yourself remembered. The river has done what rivers do. In your lucid dream, you have received its gift.

The river speaks one last time: Return whenever needed. The water never stops flowing. The renewal never stops being available. In your lucid dream, you carry the river within you now.

When you wake, look for rivers in your dreams. Waters that flow and transform. When you see them, remember: I am dreaming. And the River of Renewal will carry you home to yourself whenever you need to begin fresh.`,
  },
];

function estimateDuration(text: string): number {
  const wordCount = text.split(/\s+/).length;
  return Math.round(wordCount / 2.5);
}

function generateMockDreams(): DreamListItem[] {
  return DREAM_SCRIPTS.map((dream, index) => {
    const category = MOCK_CATEGORIES[index % MOCK_CATEGORIES.length];
    const summaryText = dream.content.split('\n\n')[0];
    
    return {
      id: `dream-${index + 1}`,
      title: dream.title,
      artwork_url: `https://picsum.photos/seed/${dream.title.replace(/\s/g, '')}/640/640`,
      preview_duration_seconds: estimateDuration(summaryText),
      full_duration_seconds: estimateDuration(dream.content),
      is_featured: index < 5,
      category: {
        name: category.name,
        slug: category.slug,
        color: category.color,
      },
    };
  });
}

export const MOCK_DREAMS: DreamListItem[] = generateMockDreams();

export function getMockDreamById(id: string): Dream | null {
  const index = MOCK_DREAMS.findIndex((d) => d.id === id);
  if (index === -1) return null;

  const listItem = MOCK_DREAMS[index];
  const dreamScript = DREAM_SCRIPTS[index];
  const category = MOCK_CATEGORIES[index % MOCK_CATEGORIES.length];

  return {
    id: listItem.id,
    title: listItem.title,
    summary: dreamScript.content.split('\n\n')[0],
    content: dreamScript.content,
    artwork_url: listItem.artwork_url,
    voice_id: 'alloy',
    default_music: {
      style: dreamScript.music,
      base_intensity: 0.4,
      adaptive: true,
    },
    preview_duration_seconds: listItem.preview_duration_seconds,
    full_duration_seconds: listItem.full_duration_seconds,
    play_count: Math.floor(Math.random() * 10000) + 100,
    is_featured: listItem.is_featured,
    category_id: category.id,
    category,
    tags: ['lucid', 'relaxing', category.slug],
    created_at: new Date(Date.now() - index * 86400000).toISOString(),
  };
}

export function searchMockDreams(query: string): DreamListItem[] {
  const lowerQuery = query.toLowerCase();
  return MOCK_DREAMS.filter(
    (dream) =>
      dream.title.toLowerCase().includes(lowerQuery) ||
      dream.category?.name.toLowerCase().includes(lowerQuery)
  );
}

export function isMockMode(): boolean {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  return !supabaseUrl || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project');
}
