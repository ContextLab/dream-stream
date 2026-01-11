import type { MusicStyle } from '@/types/database';

export interface MeditationContent {
  id: string;
  title: string;
  description: string;
  music: MusicStyle;
  content: string;
  durationMinutes: number;
}

// Sleep meditation script with breathing guidance and progressive muscle relaxation
// Uses [PAUSE:Xs] markers for timed pauses (X = seconds)
// Uses [MUSIC:Xm] for extended music-only sections (X = minutes)

export const SLEEP_MEDITATION: MeditationContent = {
  id: 'meditation-sleep',
  title: 'Gentle Journey to Sleep',
  description: 'A calming meditation to help you drift into peaceful sleep',
  music: 'ambient',
  durationMinutes: 40,
  content: `Welcome to this gentle journey into sleep. Find a comfortable position and allow your body to settle. There is nothing you need to do right now except breathe and let go.

[PAUSE:5s]

Let your eyes close softly. Take a slow, deep breath in through your nose... hold it gently... and release through your mouth with a soft sigh. Feel your body sink a little deeper into your bed.

[PAUSE:3s]

Take another deep breath in... filling your lungs completely... and as you exhale, let any remaining tension from the day flow out of you like water.

[PAUSE:3s]

One more deep breath... breathing in peace and calm... and breathing out anything that no longer serves you.

[PAUSE:5s]

Now let your breathing return to its natural rhythm. There's no need to control it. Simply notice each breath as it comes and goes, like gentle waves on a shore.

[PAUSE:8s]

With each exhale, you become more relaxed. With each breath, you drift a little closer to the peaceful realm of sleep.

[PAUSE:10s]

Now we'll gently relax each part of your body, starting from the top of your head and flowing down to your toes. There's no effort required. Simply bring your awareness to each area, and let it soften.

[PAUSE:5s]

Bring your attention to your forehead. Notice any tension there. As you breathe out, let your forehead smooth and relax. Feel it soften like butter melting in warm sunlight.

[PAUSE:5s]

Let this relaxation flow down to your eyes. Your eyelids become heavy and soft. The tiny muscles around your eyes release and let go.

[PAUSE:5s]

Feel your cheeks relax. Your jaw unclenches, your teeth part slightly. Let your tongue rest loosely in your mouth. Your whole face is soft and peaceful.

[PAUSE:8s]

This wave of relaxation flows into your neck. Feel the muscles on the sides and back of your neck release their grip. Your head feels heavier, sinking deeper into your pillow.

[PAUSE:5s]

Your shoulders drop away from your ears. Let them fall, releasing the weight of the day. Any burdens you've been carrying can be set down now. You don't need them anymore tonight.

[PAUSE:8s]

Feel the relaxation spreading across your upper back, between your shoulder blades. These muscles that work so hard to support you can finally rest.

[PAUSE:5s]

The warmth flows down your spine, vertebra by vertebra. Your middle back softens. Your lower back releases into the bed beneath you.

[PAUSE:8s]

Bring your awareness to your chest. Feel it rise and fall with each easy breath. Your heart beats steadily, peacefully, asking nothing of you.

[PAUSE:5s]

Your stomach softens. Release any tightness you've been holding there. Let your belly be soft and relaxed, rising and falling gently with your breath.

[PAUSE:8s]

Now feel the relaxation flowing down your arms. Your upper arms grow heavy. Your elbows release. Your forearms become soft and loose.

[PAUSE:5s]

This peaceful feeling flows into your wrists, your hands, your palms. Feel each finger relax, one by one. Thumb... index finger... middle finger... ring finger... pinky. Your hands are completely at rest.

[PAUSE:10s]

Bring your attention to your hips. Feel them sink into the mattress. Any tension stored here melts away with each breath.

[PAUSE:5s]

The relaxation flows into your thighs. Feel the large muscles in your upper legs become heavy and soft. They've carried you through this day, and now they can rest.

[PAUSE:5s]

Your knees relax. Your calves soften. The muscles in your shins let go.

[PAUSE:5s]

Finally, feel this wave of peace wash over your ankles, the tops of your feet, and your soles. Each toe relaxes... one by one... until your entire foot is soft and warm.

[PAUSE:10s]

Your whole body is now deeply relaxed. From the top of your head to the tips of your toes, you are at peace. You are safe. You are held.

[PAUSE:8s]

As you drift now toward sleep, know that your dreams await you. They will unfold naturally, bringing whatever your mind needs tonight.

[PAUSE:5s]

There is nothing more you need to do. Just breathe... and let go... and allow sleep to take you gently into its embrace.

[PAUSE:10s]

Rest now. Sleep peacefully. Sweet dreams.

[MUSIC:30m]`,
};

// Volume test audio content (no fades, short duration)
export const VOLUME_TEST: MeditationContent = {
  id: 'volume-test',
  title: 'Volume Test',
  description: 'A short audio sample for setting your preferred volume',
  music: 'ambient',
  durationMinutes: 0.25,
  content: `My voice is your dream guide.`,
};
