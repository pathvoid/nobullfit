alias Nobullfit.Articles
alias Nobullfit.Articles.Article

# Secret Sauce Article
secret_sauce_content = """
<div class="space-y-8">
  <p class="text-base-content/80 leading-relaxed">
    Ever wonder why the scale drops quickly at first, then slows down? Or why you can't choose where fat comes off?
    Let me break down the science of fat loss—no BS, just facts.
  </p>

  <img src="https://cdn.nobull.fit/dragonfruit-sauce.png" alt="NoBullFit" class="w-32 h-auto mx-auto" />

  <div class="space-y-8">
    <div>
      <h3 class="text-xl font-semibold mb-4 text-primary">Phase 1: The Water Weight Drop</h3>
      <p class="text-base-content/80 leading-relaxed">
        If you eat in a calorie deficit, your body will first lose water weight because glycogen (stored carbs) releases water as it's used up.
        That's why the scale often drops quickly in the beginning.
      </p>
    </div>

    <div>
      <h3 class="text-xl font-semibold mb-4 text-primary">Phase 2: The Fat Burning Begins</h3>
      <p class="text-base-content/80 leading-relaxed">
        As you stay in a deficit, your body continues to use glycogen for energy, but it also starts tapping into fat stores right away.
        Over time, fat use increases, but you can't choose where the fat comes from—your body decides that based on genetics.
      </p>
    </div>

    <div>
      <h3 class="text-xl font-semibold mb-4 text-primary">The Science of Fat Loss</h3>
      <p class="text-base-content/80 leading-relaxed">
        Fat cells shrink in size, and the majority of the fat is lost as carbon dioxide when you breathe out,
        with the rest leaving as water through urine and sweat.
      </p>
    </div>

    <div>
      <h3 class="text-xl font-semibold mb-4 text-primary">The Muscle Preservation Factor</h3>
      <p class="text-base-content/80 leading-relaxed">
        If you strength train and eat plenty of protein, you'll preserve and build muscle while losing fat.
        This keeps you looking lean and strong, instead of just smaller or "flat."
      </p>
    </div>
  </div>
</div>
"""

# Complete Guide Article
complete_guide_content = """
<div class="space-y-8">
  <p class="text-base-content/80 leading-relaxed">
    Staying healthy and losing weight doesn't have to be complicated. You don't need a perfect plan, expensive supplements, or a 90-day challenge to get started. You just need to take that first step — and keep stepping.
  </p>

  <img src="https://cdn.nobull.fit/pineapple-math.png" alt="NoBullFit" class="w-32 h-auto mx-auto" />

  <div class="space-y-8">
    <div>
      <h3 class="text-xl font-semibold mb-4 text-primary">Start Simple, Stay Consistent</h3>
      <p class="text-base-content/80 leading-relaxed">
        If you're waiting for motivation to magically appear, don't. Progress doesn't start with motivation — it starts with action. Walking for ten minutes is better than planning a one-hour workout you'll never do. Pick something manageable and do it consistently. That's how habits are built.
      </p>
      <p class="text-base-content/80 leading-relaxed mt-4">
        Don't try to change everything at once. Choose one small win — whether it's a daily walk, drinking more water, or cutting out that second soda — and make it stick.
      </p>
    </div>

    <div>
      <h3 class="text-xl font-semibold mb-4 text-primary">What You Eat Matters (But It Doesn't Have to Be Miserable)</h3>
      <p class="text-base-content/80 leading-relaxed">
        You don't need a new diet. You need better choices, most of the time. Eat real food. Prioritize protein. Add more vegetables. Drink more water. Cut back on ultra-processed junk, not because it's evil, but because it makes it easier to overeat.
      </p>
      <p class="text-base-content/80 leading-relaxed mt-4">
        Forget perfect. Focus on <em>better</em>. Every meal is a chance to get it right — or at least, get it <em>less wrong</em>.
      </p>
    </div>

    <div>
      <h3 class="text-xl font-semibold mb-4 text-primary">Movement Isn't Just the Gym</h3>
      <p class="text-base-content/80 leading-relaxed">
        You don't have to be a gym rat. Walking, stretching, dancing, taking the stairs — it all adds up. Strength training helps preserve muscle (especially while losing fat), but if that's not your thing yet, start with what is.
      </p>
      <p class="text-base-content/80 leading-relaxed mt-4">
        If you're moving more today than you did yesterday, you're already winning.
      </p>
    </div>

    <div>
      <h3 class="text-xl font-semibold mb-4 text-primary">Rest Is Part of the Process</h3>
      <p class="text-base-content/80 leading-relaxed">
        Sleep isn't optional. Neither is rest. Most people burn out trying to go too hard, too fast. Let your body recover. Aim for 7–9 hours of sleep. Take rest days seriously. Progress happens when you recover, not when you grind non-stop.
      </p>
      <p class="text-base-content/80 leading-relaxed mt-4">
        And if you're stressed? That's part of your health too. Mental burnout can sabotage physical progress. Don't ignore it.
      </p>
    </div>

    <div>
      <h3 class="text-xl font-semibold mb-4 text-primary">Fat Loss? It's All About the Deficit</h3>
      <p class="text-base-content/80 leading-relaxed">
        There's no secret. If you burn more than you eat, you lose fat. The trick is doing it in a way that doesn't make you miserable. Eat enough to stay sane. Move enough to make a difference. Track progress by weeks, not days.
      </p>
      <p class="text-base-content/80 leading-relaxed mt-4">
        And no — you can't "target belly fat." Your body decides where it comes off. Be patient.
      </p>
    </div>

    <div>
      <h3 class="text-xl font-semibold mb-4 text-primary">Forget Perfection. Aim for Progress.</h3>
      <p class="text-base-content/80 leading-relaxed">
        You will mess up. Everyone does. The difference between people who get results and those who don't? The ones who succeed get back on track.
      </p>
      <p class="text-base-content/80 leading-relaxed mt-4">
        Perfection is a myth. Progress is the goal.
      </p>
    </div>
  </div>
</div>
"""

# Create Secret Sauce Article
{:ok, secret_sauce} = Articles.create_article(%{
  title: "The Secret Sauce: How Fat Loss Actually Works",
  slug: "secret-sauce-fat-loss",
  excerpt: "Ever wonder why the scale drops quickly at first, then slows down? Let me break down the science of fat loss—no BS, just facts.",
  content: secret_sauce_content,
  author: "Professor Pear",
  author_avatar: "https://cdn.nobull.fit/professor-pear.png",
  featured: true,
  active: true,
  published_at: DateTime.utc_now(),
  meta_title: "The Secret Sauce: How Fat Loss Actually Works",
  meta_description: "Fat loss is a process, not an event. Focus on consistency over speed, and remember that muscle preservation is just as important as fat loss."
})

# Create Complete Guide Article
{:ok, complete_guide} = Articles.create_article(%{
  title: "Complete Guide to Getting Fit",
  slug: "complete-guide-getting-fit",
  excerpt: "The comprehensive guide with all the details you need to start your fitness journey. Start simple, stay consistent, and get results.",
  content: complete_guide_content,
  author: "Professor Pear",
  author_avatar: "https://cdn.nobull.fit/professor-pear.png",
  featured: false,
  active: true,
  published_at: DateTime.utc_now(),
  meta_title: "Complete Guide to Getting Fit",
  meta_description: "Start small, stay consistent, and don't fall for fads. You don't need more willpower — just a better strategy."
})

IO.puts("Created articles:")
IO.puts("- #{secret_sauce.title} (Featured)")
IO.puts("- #{complete_guide.title}")
