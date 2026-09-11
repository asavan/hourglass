export default function main(window, document) {
    const config = {
        totalMinutes: 1,
        showDigitalTimer: true,
        soundEnabled: true
    };

    const state = {
        totalSeconds: 60,
        sandA: 0.0,
        sandB: 1.0,
        isFinished: false,
        visualRotation: 0,
        targetRotation: 0,
        hasGyroscope: false,
        lastFrameTime: performance.now(),
        sandParticles: []
    };

    const canvas = document.getElementById("hourglass-canvas");
    const ctx = canvas.getContext("2d");
    const digitalTimer = document.getElementById("digital-timer");
    const timerSection = document.getElementById("timer-section");
    const settingsBtn = document.getElementById("settings-btn");
    const settingsModal = document.getElementById("settings-modal");
    const closeSettingsBtn = document.getElementById("close-settings-btn");
    const saveSettingsBtn = document.getElementById("save-settings-btn");
    const minutesInput = document.getElementById("minutes-input");
    const toggleDigitalTimer = document.getElementById("toggle-digital-timer");
    const testSoundBtn = document.getElementById("test-sound-btn");
    const gyroPermissionBlock = document.getElementById("gyro-permission-block");
    const requestGyroBtn = document.getElementById("request-gyro-btn");

    let audioCtx = null;

    function getAudioContext() {
        if (!audioCtx) {
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            if (AudioCtxClass) {
                audioCtx = new AudioCtxClass();
            }
        }
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playBeepBeepBeep() {
        try {
            const actx = getAudioContext();
            if (!actx) {
                return;
            }

            const beeps = [0, 0.2, 0.4];
            const beepDuration = 0.12;

            beeps.forEach((startTime) => {
                const osc = actx.createOscillator();
                const gain = actx.createGain();

                osc.type = "sine";
                osc.frequency.setValueAtTime(880, actx.currentTime + startTime);

                gain.gain.setValueAtTime(0.01, actx.currentTime + startTime);
                gain.gain.exponentialRampToValueAtTime(0.3, actx.currentTime + startTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + startTime + beepDuration);

                osc.connect(gain);
                gain.connect(actx.destination);

                osc.start(actx.currentTime + startTime);
                osc.stop(actx.currentTime + startTime + beepDuration);
            });
        } catch (e) {
            console.error("Audio playback error:", e);
        }
    }

    function resizeCanvas() {
        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
    }

    window.addEventListener("resize", resizeCanvas);

    function getGlassHeight(w, h) {
        const capHeight = 16;
        const extraHeight = capHeight * 2;
        const extraWidth = 24;

        const maxH = h - extraHeight;
        const maxW = (w - extraWidth) / 0.52;

        return Math.max(120, Math.min(maxH, maxW));
    }

    function updateSandParticles(dt, isFlowing, isTopBulbA, halfH, targetSandH) {
        if (isFlowing && Math.random() < 0.85) {
            const speed = isTopBulbA ? (120 + Math.random() * 120) : -(120 + Math.random() * 120);
            state.sandParticles.push({
                x: (Math.random() - 0.5) * 4,
                y: 0,
                vx: (Math.random() - 0.5) * 10,
                vy: speed,
                size: 1.2 + Math.random() * 1.5,
                life: 0
            });
        }

        const limitY = Math.max(0, halfH - targetSandH - 4);

        for (let i = state.sandParticles.length - 1; i >= 0; i--) {
            const p = state.sandParticles[i];
            p.y += p.vy * dt;
            p.x += p.vx * dt;
            p.life += dt;

            const hitSand = isTopBulbA ? (p.y >= limitY) : (p.y <= -limitY);

            if (p.life > 0.55 || hitSand) {
                state.sandParticles.splice(i, 1);
            }
        }
    }

    function drawHourglass() {
        const w = canvas.width / (window.devicePixelRatio || 1);
        const h = canvas.height / (window.devicePixelRatio || 1);

        ctx.clearRect(0, 0, w, h);

        ctx.save();
        ctx.translate(w / 2, h / 2);

        const rotationDiff = state.targetRotation - state.visualRotation;
        if (Math.abs(rotationDiff) > 0.1) {
            state.visualRotation += rotationDiff * 0.14;
        } else {
            state.visualRotation = state.targetRotation;
        }

        const rad = (state.visualRotation * Math.PI) / 180;
        // const cosA = Math.cos(rad);

        ctx.rotate(rad);

        const glassHeight = getGlassHeight(w, h);
        const glassWidth = glassHeight * 0.52;
        const halfH = glassHeight / 2;
        const halfW = glassWidth / 2;
        const neckRadius = 8;

        const capHeight = 16;
        const capWidth = glassWidth + 24;

        const capGrad = ctx.createLinearGradient(-capWidth / 2, 0, capWidth / 2, 0);
        capGrad.addColorStop(0, "#5c3a21");
        capGrad.addColorStop(0.3, "#a37042");
        capGrad.addColorStop(0.5, "#e3b888");
        capGrad.addColorStop(0.7, "#a37042");
        capGrad.addColorStop(1, "#5c3a21");

        // Top Cap
        ctx.fillStyle = capGrad;
        ctx.beginPath();
        ctx.roundRect(-capWidth / 2, -halfH - capHeight, capWidth, capHeight, [6, 6, 2, 2]);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Bottom Cap
        ctx.beginPath();
        ctx.roundRect(-capWidth / 2, halfH, capWidth, capHeight, [2, 2, 6, 6]);
        ctx.fill();
        ctx.stroke();

        // Side Pillars
        const pillarOffset = halfW + 6;
        const pillarGrad = ctx.createLinearGradient(0, -halfH, 0, halfH);
        pillarGrad.addColorStop(0, "#80532c");
        pillarGrad.addColorStop(0.5, "#d4af37");
        pillarGrad.addColorStop(1, "#80532c");

        ctx.fillStyle = pillarGrad;
        ctx.fillRect(-pillarOffset - 3, -halfH, 6, glassHeight);
        ctx.fillRect(pillarOffset - 3, -halfH, 6, glassHeight);

        function drawBulbAPath() {
            ctx.beginPath();
            ctx.moveTo(-neckRadius, -6);
            ctx.bezierCurveTo(-neckRadius - 10, -halfH * 0.4, -halfW, -halfH * 0.7, -halfW + 4, -halfH + 2);
            ctx.lineTo(halfW - 4, -halfH + 2);
            ctx.bezierCurveTo(halfW, -halfH * 0.7, neckRadius + 10, -halfH * 0.4, neckRadius, -6);
            ctx.closePath();
        }

        function drawBulbBPath() {
            ctx.beginPath();
            ctx.moveTo(-neckRadius, 6);
            ctx.bezierCurveTo(-neckRadius - 10, halfH * 0.4, -halfW, halfH * 0.7, -halfW + 4, halfH - 2);
            ctx.lineTo(halfW - 4, halfH - 2);
            ctx.bezierCurveTo(halfW, halfH * 0.7, neckRadius + 10, halfH * 0.4, neckRadius, 6);
            ctx.closePath();
        }

        const maxSandH = halfH - 12;
        const isCanvasFlipped = (Math.cos(rad) < 0);
        const isTopBulbA = isUpsideDown ? isCanvasFlipped : !isCanvasFlipped;

        // Sand in Bulb A
        if (state.sandA > 0.0005) {
            ctx.save();
            drawBulbAPath();
            ctx.clip();

            const isTopA = isTopBulbA;
            const visualRatioA = isTopA ? Math.pow(state.sandA, 0.6) : Math.pow(state.sandA, 0.85);
            const sandH = Math.max(isTopA ? 6 : 2, maxSandH * visualRatioA);

            const sandGrad = ctx.createLinearGradient(0, -halfH, 0, 0);
            sandGrad.addColorStop(0, "#fef08a");
            sandGrad.addColorStop(0.5, "#eab308");
            sandGrad.addColorStop(1, "#ca8a04");

            ctx.fillStyle = sandGrad;
            ctx.beginPath();

            if (isTopA) {
                const sandY = -sandH;
                const funnelDip = (state.sandA > 0.005 && state.sandA < 0.98) ? Math.min(10, sandH * 0.4) : 2;
                ctx.moveTo(-halfW, sandY);
                ctx.quadraticCurveTo(0, sandY + funnelDip, halfW, sandY);
                ctx.lineTo(halfW, 0);
                ctx.lineTo(-halfW, 0);
            } else {
                const sandY = -halfH + sandH;
                const conePeak = (state.sandB > 0.005 && state.sandA < 0.98) ? 12 : 2;
                ctx.moveTo(-halfW, -halfH);
                ctx.lineTo(-halfW, sandY - conePeak / 2);
                ctx.quadraticCurveTo(0, sandY + conePeak, halfW, sandY - conePeak / 2);
                ctx.lineTo(halfW, -halfH);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // Sand in Bulb B
        if (state.sandB > 0.0005) {
            ctx.save();
            drawBulbBPath();
            ctx.clip();

            const isTopB = !isTopBulbA;
            const visualRatioB = isTopB ? Math.pow(state.sandB, 0.6) : Math.pow(state.sandB, 0.85);
            const sandH = Math.max(isTopB ? 6 : 2, maxSandH * visualRatioB);

            const sandGrad = ctx.createLinearGradient(0, 0, 0, halfH);
            sandGrad.addColorStop(0, "#fef08a");
            sandGrad.addColorStop(0.5, "#eab308");
            sandGrad.addColorStop(1, "#ca8a04");

            ctx.fillStyle = sandGrad;
            ctx.beginPath();

            if (!isTopB) {
                const sandY = halfH - sandH;
                const conePeak = (state.sandA > 0.005 && state.sandB < 0.98) ? 12 : 2;
                ctx.moveTo(-halfW, halfH);
                ctx.lineTo(-halfW, sandY + conePeak / 2);
                ctx.quadraticCurveTo(0, sandY - conePeak, halfW, sandY - conePeak / 2);
                ctx.lineTo(halfW, halfH);
            } else {
                const sandY = sandH;
                const funnelDip = (state.sandB > 0.005 && state.sandB < 0.98) ? Math.min(10, sandH * 0.4) : 2;
                ctx.moveTo(-halfW, sandY);
                ctx.quadraticCurveTo(0, sandY - funnelDip, halfW, sandY);
                ctx.lineTo(halfW, 0);
                ctx.lineTo(-halfW, 0);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // Stream & Particles
        const topSandAmount = isTopBulbA ? state.sandA : state.sandB;
        const bottomSandAmount = isTopBulbA ? state.sandB : state.sandA;
        const targetSandH = maxSandH * Math.pow(bottomSandAmount, 0.85);

        if (topSandAmount > 0.0001) {
            ctx.save();
            if (isTopBulbA) {
                drawBulbBPath();
            } else {
                drawBulbAPath();
            }
            ctx.clip();

            const streamDir = isTopBulbA ? 1 : -1;
            const streamLength = halfH - targetSandH;

            const streamGrad = ctx.createLinearGradient(0, 0, 0, streamLength * streamDir);
            streamGrad.addColorStop(0, "#fef08a");
            streamGrad.addColorStop(0.5, "#eab308");
            streamGrad.addColorStop(1, "rgba(234, 179, 8, 0.3)");

            ctx.fillStyle = streamGrad;
            ctx.beginPath();
            if (isTopBulbA) {
                ctx.rect(-1.5, 0, 3, streamLength);
            } else {
                ctx.rect(-1.5, -streamLength, 3, streamLength);
            }
            ctx.fill();

            ctx.fillStyle = "#fef08a";
            state.sandParticles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.restore();
        }

        // Outer Glass Shell & Reflection
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";

        ctx.beginPath();
        ctx.moveTo(-halfW + 4, -halfH + 2);
        ctx.bezierCurveTo(-halfW, -halfH * 0.7, -neckRadius - 10, -halfH * 0.4, -neckRadius, -2);
        ctx.lineTo(-neckRadius, 2);
        ctx.bezierCurveTo(-neckRadius - 10, halfH * 0.4, -halfW, halfH * 0.7, -halfW + 4, halfH - 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(halfW - 4, -halfH + 2);
        ctx.bezierCurveTo(halfW, -halfH * 0.7, neckRadius + 10, -halfH * 0.4, neckRadius, -2);
        ctx.lineTo(neckRadius, 2);
        ctx.bezierCurveTo(neckRadius + 10, halfH * 0.4, halfW, halfH * 0.7, halfW - 4, halfH - 2);
        ctx.stroke();

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.beginPath();
        ctx.moveTo(-halfW + 8, -halfH + 16);
        ctx.bezierCurveTo(-halfW + 5, -halfH * 0.6, -neckRadius - 6, -halfH * 0.35, -neckRadius - 2, -12);
        ctx.stroke();

        ctx.restore();
    }

    function updateSimulation(now) {
        const dt = Math.min((now - state.lastFrameTime) / 1000, 0.1);
        state.lastFrameTime = now;

        const rad = (state.visualRotation * Math.PI) / 180;
        const isCanvasFlipped = (Math.cos(rad) < 0);
        const isTopBulbA = isUpsideDown ? isCanvasFlipped : !isCanvasFlipped;

        const topSand = isTopBulbA ? state.sandA : state.sandB;
        const bottomSandAmount = isTopBulbA ? state.sandB : state.sandA;

        const glassHeight = getGlassHeight(
            canvas.width / (window.devicePixelRatio || 1),
            canvas.height / (window.devicePixelRatio || 1)
        );
        const halfH = glassHeight / 2;
        const maxSandH = halfH - 12;
        const targetSandH = maxSandH * Math.pow(bottomSandAmount, 0.85);

        if (topSand > 0) {
            const deltaSand = dt / state.totalSeconds;

            if (isTopBulbA) {
                state.sandA = Math.max(0, state.sandA - deltaSand);
                state.sandB = Math.min(1.0, state.sandB + deltaSand);
            } else {
                state.sandB = Math.max(0, state.sandB - deltaSand);
                state.sandA = Math.min(1.0, state.sandA + deltaSand);
            }

            const remainingTop = isTopBulbA ? state.sandA : state.sandB;
            if (remainingTop <= 0) {
                state.isFinished = true;
                if (config.soundEnabled) {
                    playBeepBeepBeep();
                }
            }

            updateSandParticles(dt, true, isTopBulbA, halfH, targetSandH);
        } else {
            updateSandParticles(dt, false, isTopBulbA, halfH, targetSandH);
        }

        drawHourglass();
        updateTimerDisplay();

        requestAnimationFrame(updateSimulation);
    }

    function updateTimerDisplay() {
        if (!config.showDigitalTimer) {
            digitalTimer.style.display = "none";
            return;
        }
        digitalTimer.style.display = "block";

        const rad = (state.visualRotation * Math.PI) / 180;
        const isCanvasFlipped = (Math.cos(rad) < 0);
        const isTopBulbA = isUpsideDown ? isCanvasFlipped : !isCanvasFlipped;
        const currentTopSand = isTopBulbA ? state.sandA : state.sandB;

        const remainingSeconds = Math.max(0, Math.ceil(currentTopSand * state.totalSeconds));
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;

        digitalTimer.textContent =
            `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    function flipHourglass() {
        getAudioContext();
        state.targetRotation += 180;
        state.isFinished = false;
    }

    function resetTimer() {
        const rad = (state.targetRotation * Math.PI) / 180;
        const isCanvasFlipped = (Math.cos(rad) < 0);
        const isTopBulbA = isUpsideDown ? isCanvasFlipped : !isCanvasFlipped;

        if (isTopBulbA) {
            state.sandA = 0.0;
            state.sandB = 1.0;
        } else {
            state.sandA = 1.0;
            state.sandB = 0.0;
        }
        state.isFinished = false;
        state.sandParticles = [];
    }

    let isUpsideDown = false;

    function handleOrientation(event) {
        const beta = event.beta;
        if (beta === null || beta === undefined) {
            return;
        }

        if (!state.hasGyroscope) {
            state.hasGyroscope = true;
        }

        const currentlyFlipped = (beta < -25);

        if (currentlyFlipped !== isUpsideDown) {
            isUpsideDown = currentlyFlipped;
            state.isFinished = false;
            getAudioContext();
        }

        // Rotate the top panel digital timer to stay upright when phone is flipped
        if (window.innerWidth <= 600) {
            const timerRotation = currentlyFlipped ? 180 : 0;
            timerSection.style.transform = `rotate(${timerRotation}deg)`;
        } else {
            timerSection.style.transform = "none";
        }
    }

    function initGyroscope() {
        if (window.DeviceOrientationEvent) {
            if (typeof DeviceOrientationEvent.requestPermission === "function") {
                gyroPermissionBlock.classList.remove("hidden");
            } else {
                gyroPermissionBlock.classList.add("hidden");
                window.addEventListener("deviceorientation", handleOrientation, true);
            }
        } else {
            gyroPermissionBlock.classList.add("hidden");
        }
    }

    canvas.addEventListener("click", flipHourglass);

    settingsBtn.addEventListener("click", () => {
        minutesInput.value = config.totalMinutes;
        toggleDigitalTimer.checked = config.showDigitalTimer;
        settingsModal.classList.remove("hidden");
    });

    closeSettingsBtn.addEventListener("click", () => {
        settingsModal.classList.add("hidden");
    });

    saveSettingsBtn.addEventListener("click", () => {
        const mins = parseInt(minutesInput.value, 10);
        if (!isNaN(mins) && mins > 0) {
            config.totalMinutes = mins;
            state.totalSeconds = mins * 60;
        }
        resetTimer();
        config.showDigitalTimer = toggleDigitalTimer.checked;
        settingsModal.classList.add("hidden");
    });

    document.querySelectorAll(".preset-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const mins = e.target.getAttribute("data-mins");
            minutesInput.value = mins;
        });
    });

    testSoundBtn.addEventListener("click", () => {
        playBeepBeepBeep();
    });

    requestGyroBtn.addEventListener("click", () => {
        if (typeof DeviceOrientationEvent.requestPermission === "function") {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === "granted") {
                        window.addEventListener("deviceorientation", handleOrientation, true);
                        gyroPermissionBlock.classList.add("hidden");
                    }
                })
                .catch(console.error);
        }
    });

    window.onload = function () {
        resizeCanvas();
        initGyroscope();
        state.lastFrameTime = performance.now();
        requestAnimationFrame(updateSimulation);
    };
}
