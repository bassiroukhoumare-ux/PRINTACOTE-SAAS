import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, MapPin, Store, Clock, MousePointer2 } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const Navbar = () => {
  const navRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        start: 'top -80',
        onUpdate: (self) => {
          if (self.direction === 1 || self.progress > 0) {
            gsap.to(navRef.current, { backgroundColor: 'rgba(242, 240, 233, 0.6)', backdropFilter: 'blur(16px)', borderColor: 'rgba(0,0,0,0.05)', color: '#1A1A1A', duration: 0.3 });
          } else {
            gsap.to(navRef.current, { backgroundColor: 'transparent', backdropFilter: 'blur(0px)', borderColor: 'transparent', color: '#F2F0E9', duration: 0.3 });
          }
        }
      });
    }, navRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <nav ref={navRef} className="flex items-center gap-8 px-6 py-3 rounded-[2rem] border border-transparent transition-colors text-[#F2F0E9]">
        <div className="font-bold text-xl font-sans tracking-tight">Printacote</div>
        <div className="hidden md:flex gap-6 text-sm font-medium">
          <a href="#features" className="hover-lift">Fonctionnalités</a>
          <a href="#protocol" className="hover-lift">Protocole</a>
        </div>
        <button className="magnetic-btn bg-accent text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2">
          <span>Créer un compte</span>
        </button>
      </nav>
    </div>
  );
};

const Hero = () => {
  return (
    <section className="relative h-[100dvh] w-full overflow-hidden bg-primary flex items-end">
      {/* Background Image Unsplash */}
      <div className="absolute inset-0 w-full h-full">
        <img 
          src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=2500&auto=format&fit=crop" 
          alt="Forêt sombre organique" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-hero-gradient"></div>
      </div>
      
      <div className="relative z-10 w-full px-8 md:px-16 pb-24 md:pb-32 flex flex-col md:w-2/3">
        <h1 className="text-[#F2F0E9] flex flex-col gap-2">
          <span className="hero-text text-3xl md:text-5xl font-sans font-bold tracking-tight">Printacote est la</span>
          <span className="hero-text text-6xl md:text-8xl font-serif italic font-semibold leading-none tracking-tight">Connexion.</span>
        </h1>
        <p className="hero-text text-[#F2F0E9]/80 mt-6 text-lg max-w-xl font-sans">
          Trouvez l'imprimerie la plus proche de vous en un instant, ou créez votre vitrine d'imprimeur en moins de 2 minutes.
        </p>
        <div className="hero-text mt-10">
          <button className="magnetic-btn bg-accent text-white px-8 py-4 rounded-[2rem] text-lg font-bold flex items-center gap-2">
            <span>Commencer l'exploration</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
};

const MixeurDiagnostique = () => {
  const [cards, setCards] = useState([
    { id: 1, text: "Recherche de proximité...", color: "bg-primary" },
    { id: 2, text: "Analyse des imprimeurs locaux...", color: "bg-dark" },
    { id: 3, text: "Connexion établie au réseau.", color: "bg-accent" }
  ]);
  const containerRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCards(prev => {
        const newCards = [...prev];
        const last = newCards.pop();
        newCards.unshift(last);
        return newCards;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-background rounded-[2rem] p-8 shadow-sm border border-dark/5 flex flex-col h-[380px]">
      <h3 className="text-xl font-bold font-sans">Mixeur de Proximité</h3>
      <p className="text-dark/60 text-sm mt-2">Trouvez les imprimeurs près de vous</p>
      
      <div ref={containerRef} className="relative mt-auto h-48 w-full flex justify-center items-end pb-4">
        {cards.map((card, i) => {
          const isTop = i === 2;
          const yOffset = i * -20;
          const scale = 1 - (2 - i) * 0.05;
          const opacity = 1 - (2 - i) * 0.3;
          
          return (
            <div 
              key={card.id}
              className={`absolute w-[90%] rounded-2xl p-4 text-white shadow-lg transition-all duration-700 ${card.color}`}
              style={{
                transform: `translateY(${yOffset}px) scale(${scale})`,
                opacity: opacity,
                zIndex: i,
                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              <div className="flex items-center gap-3">
                <MapPin size={18} className="opacity-80" />
                <span className="font-mono text-sm">{card.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MachineTypewriter = () => {
  const [text, setText] = useState("");
  const fullText = "INITIALISATION VITRINE...\nCREATION PROFIL...\nAJOUT SERVICES...\nVITRINE EN LIGNE: OK < 2mn";
  
  useEffect(() => {
    let currentText = "";
    let i = 0;
    const interval = setInterval(() => {
      currentText += fullText[i];
      setText(currentText);
      i++;
      if(i >= fullText.length) {
        clearInterval(interval);
        setTimeout(() => {
          setText("");
        }, 4000); // loop
      }
    }, 80);
    return () => clearInterval(interval);
  }, [text === ""]);

  return (
    <div className="bg-background rounded-[2rem] p-8 shadow-sm border border-dark/5 flex flex-col h-[380px]">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold font-sans">Déploiement Rapide</h3>
          <p className="text-dark/60 text-sm mt-2">Créer un mini site vitrine</p>
        </div>
        <div className="flex items-center gap-2 bg-dark/5 px-3 py-1 rounded-full">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
          <span className="font-mono text-[10px] uppercase font-bold text-dark/70">Flux en direct</span>
        </div>
      </div>
      
      <div className="mt-8 bg-dark text-background rounded-2xl p-6 flex-grow font-mono text-sm leading-relaxed overflow-hidden">
        <div className="opacity-50 text-xs mb-2"># TERMINAL_IMPRIMEUR</div>
        <div className="whitespace-pre-wrap">
          {text}
          <span className="inline-block w-2 h-4 bg-accent ml-1 animate-pulse"></span>
        </div>
      </div>
    </div>
  );
};

const PlanificateurCurseur = () => {
  const containerRef = useRef(null);
  const cursorRef = useRef(null);
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const [activeDays, setActiveDays] = useState([true, true, true, true, true, true, true]); // 24/7

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });
      
      // Move to middle day
      tl.to(cursorRef.current, {
        x: 150,
        y: 40,
        duration: 1,
        ease: 'power2.inOut'
      })
      // Click effect
      .to(cursorRef.current, { scale: 0.8, duration: 0.1 })
      .to(cursorRef.current, { scale: 1, duration: 0.1 })
      // Move to save button
      .to(cursorRef.current, {
        x: 220,
        y: 120,
        duration: 1,
        ease: 'power2.inOut',
        delay: 0.5
      })
      // Click save
      .to(cursorRef.current, { scale: 0.8, duration: 0.1 })
      .to(cursorRef.current, { scale: 1, duration: 0.1 })
      // Fade out and reset
      .to(cursorRef.current, { opacity: 0, duration: 0.3 })
      .set(cursorRef.current, { x: 0, y: 0 })
      .to(cursorRef.current, { opacity: 1, duration: 0.3 });
      
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="bg-background rounded-[2rem] p-8 shadow-sm border border-dark/5 flex flex-col h-[380px]">
      <h3 className="text-xl font-bold font-sans">Horloge Continue</h3>
      <p className="text-dark/60 text-sm mt-2">Disponible 24h/24 7jours/7</p>
      
      <div ref={containerRef} className="relative mt-8 bg-white/50 rounded-2xl p-6 flex-grow border border-dark/5 flex flex-col items-center">
        <div className="flex gap-2 w-full justify-between mb-8">
          {days.map((d, i) => (
            <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-sans ${activeDays[i] ? 'bg-primary text-white' : 'bg-dark/10'}`}>
              {d}
            </div>
          ))}
        </div>
        
        <div className="mt-auto self-end bg-accent/10 text-accent font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2">
          <Clock size={14} /> Toujours Ouvert
        </div>

        {/* SVG Cursor */}
        <div ref={cursorRef} className="absolute top-0 left-0 text-dark drop-shadow-md z-10" style={{ pointerEvents: 'none' }}>
          <MousePointer2 size={24} fill="currentColor" />
        </div>
      </div>
    </div>
  );
};

const Features = () => {
  return (
    <section id="features" className="py-32 px-6 md:px-16 bg-[#F2F0E9]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <MixeurDiagnostique />
          <MachineTypewriter />
          <PlanificateurCurseur />
        </div>
      </div>
    </section>
  );
};

const Philosophy = () => {
  const textRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.philo-line', {
        scrollTrigger: {
          trigger: textRef.current,
          start: 'top 80%',
        },
        y: 40,
        opacity: 0,
        stagger: 0.15,
        duration: 1,
        ease: 'power3.out',
      });
    }, textRef);
    return () => ctx.revert();
  }, []);

  return (
    <section className="relative py-40 px-6 md:px-16 bg-dark text-background overflow-hidden philo-section">
      <div className="absolute inset-0 w-full h-full opacity-10">
        <img 
          src="https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=2500&auto=format&fit=crop" 
          alt="Texture mousse organique" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div ref={textRef} className="relative z-10 max-w-4xl mx-auto flex flex-col gap-12">
        <p className="philo-line text-lg md:text-xl font-sans text-background/60">
          La plupart des plateformes se concentrent sur : l'intermédiation complexe et lente.
        </p>
        <h2 className="philo-line text-5xl md:text-7xl font-serif italic font-semibold leading-tight">
          Nous nous concentrons sur : <span className="text-accent not-italic font-sans tracking-tight">l'instantanéité.</span>
        </h2>
      </div>
    </section>
  );
};

const ProtocolCard = ({ number, title, desc, animType }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    let animationFrameId;
    let time = 0;

    const render = () => {
      time += 0.02;
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;
      ctx.clearRect(0, 0, width, height);

      if (animType === 'waves') {
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * 0.05 + time) * 20;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#CC5833';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (animType === 'circles') {
        ctx.beginPath();
        ctx.arc(width/2, height/2, 30 + Math.sin(time) * 10, 0, Math.PI * 2);
        ctx.strokeStyle = '#2E4036';
        ctx.lineWidth = 4;
        ctx.stroke();
      } else if (animType === 'grid') {
        const cellSize = 20;
        ctx.fillStyle = '#1A1A1A';
        for (let x = 0; x < width; x += cellSize) {
          for (let y = 0; y < height; y += cellSize) {
            if (Math.random() > 0.95) {
              ctx.fillRect(x, y, 2, 2);
            }
          }
        }
        ctx.fillStyle = '#CC5833';
        ctx.fillRect((time * 50) % width, height/2, 40, 2);
      }

      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [animType]);

  return (
    <div className="protocol-card sticky top-0 h-[100vh] w-full flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-5xl bg-white rounded-[3rem] p-12 shadow-xl border border-dark/5 flex flex-col md:flex-row items-center gap-16 h-[60vh]">
        <div className="flex-1 flex flex-col gap-6">
          <div className="font-mono text-accent text-lg font-bold">0{number}</div>
          <h3 className="text-4xl md:text-5xl font-sans font-bold text-dark tracking-tight">{title}</h3>
          <p className="text-xl text-dark/70 font-sans leading-relaxed">{desc}</p>
        </div>
        <div className="flex-1 w-full h-full relative rounded-[2rem] overflow-hidden bg-[#F2F0E9] border border-dark/10 flex items-center justify-center">
          <canvas ref={canvasRef} width={400} height={300} className="w-full h-full object-cover mix-blend-multiply opacity-50"></canvas>
        </div>
      </div>
    </div>
  );
};

const Protocol = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.protocol-card');
      cards.forEach((card, i) => {
        if(i < cards.length - 1) {
          gsap.to(card, {
            scale: 0.92,
            opacity: 0.4,
            filter: 'blur(10px)',
            scrollTrigger: {
              trigger: cards[i + 1],
              start: 'top bottom',
              end: 'top top',
              scrub: true,
            }
          });
        }
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="protocol" ref={containerRef} className="relative w-full">
      <ProtocolCard 
        number={1} 
        title="Création du profil" 
        desc="Les imprimeurs génèrent une vitrine professionnelle en quelques secondes. Sans code, sans friction."
        animType="circles"
      />
      <ProtocolCard 
        number={2} 
        title="Indexation Locale" 
        desc="Notre algorithme cartographie immédiatement la nouvelle imprimerie pour les clients à proximité."
        animType="grid"
      />
      <ProtocolCard 
        number={3} 
        title="Mise en relation" 
        desc="Les clients trouvent, choisissent et contactent le bon imprimeur à côté de chez eux, instantanément."
        animType="waves"
      />
    </section>
  );
};

const CTA = () => {
  return (
    <section className="py-32 px-6 md:px-16 bg-[#F2F0E9] flex justify-center">
      <div className="bg-primary text-background rounded-[3rem] p-16 w-full max-w-5xl flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-30"></div>
        <div className="relative z-10 flex flex-col items-center gap-8">
          <h2 className="text-4xl md:text-6xl font-sans font-bold tracking-tight">Prêt à rejoindre l'écosystème ?</h2>
          <p className="text-lg md:text-xl text-background/80 max-w-2xl font-sans">
            Que vous soyez imprimeur ou client, trouvez votre place dans le réseau local dès aujourd'hui.
          </p>
          <div className="flex gap-4 mt-4">
            <button className="magnetic-btn bg-accent text-white px-8 py-4 rounded-full font-bold text-lg">
              Créer un compte
            </button>
            <button className="magnetic-btn bg-transparent border-2 border-background/20 text-background px-8 py-4 rounded-full font-bold text-lg hover:bg-background/10 transition-colors">
              Rechercher
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-dark text-background rounded-t-[4rem] px-8 md:px-16 pt-24 pb-12 flex flex-col gap-16 mt-[-4rem] relative z-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-background/10 pb-16">
        <div className="flex flex-col gap-6">
          <div className="font-bold text-3xl font-sans tracking-tight">Printacote</div>
          <p className="text-background/60 max-w-xs font-sans">La connexion instantanée entre imprimeurs et clients locaux.</p>
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="font-mono text-sm uppercase text-background/40">Navigation</h4>
          <a href="#features" className="hover:text-accent transition-colors">Fonctionnalités</a>
          <a href="#protocol" className="hover:text-accent transition-colors">Protocole</a>
          <a href="#" className="hover:text-accent transition-colors">Connexion</a>
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="font-mono text-sm uppercase text-background/40">Légal</h4>
          <a href="#" className="hover:text-accent transition-colors">Confidentialité</a>
          <a href="#" className="hover:text-accent transition-colors">Conditions Générales</a>
        </div>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-background/40 text-sm">© 2026 Printacote. Tous droits réservés.</p>
        <div className="flex items-center gap-2 bg-background/5 px-4 py-2 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="font-mono text-xs text-background/80">Système Opérationnel</span>
        </div>
      </div>
    </footer>
  );
};

export default function App() {
  const containerRef = useRef(null);

  useEffect(() => {
    // Initial cleanup if needed
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="noise-overlay" />
      <Navbar />
      <Hero />
      <Features />
      <Philosophy />
      <Protocol />
      <CTA />
      <Footer />
    </div>
  );
}
