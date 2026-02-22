<script lang="ts">
  import { onMount } from "svelte";

  let { trigger = false }: { trigger: boolean } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    rotation: number;
    rotationSpeed: number;
    life: number;
  }> = [];
  let animationFrame: number | undefined;

  const colors = ["#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

  function spawn() {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    particles = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2 - 100,
        vx: (Math.random() - 0.5) * 12,
        vy: Math.random() * -10 - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 3,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        life: 1,
      });
    }

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // gravity
        p.rotation += p.rotationSpeed;
        p.life -= 0.012;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (alive) {
        animationFrame = requestAnimationFrame(animate);
      }
    }

    animate();
  }

  $effect(() => {
    if (trigger) {
      spawn();
    }
  });

  onMount(() => {
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  });
</script>

{#if trigger}
  <canvas
    bind:this={canvas}
    class="fixed inset-0 z-[9999] pointer-events-none"
  ></canvas>
{/if}
