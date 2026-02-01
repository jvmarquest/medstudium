import React, { useState, useEffect } from 'react';
import { View } from '../types';
import {
    CheckCircle2,
    Menu,
    X,
    ChevronRight,
    Star,
    Users,
    Zap,
    BookOpen,
    Clock,
    Search,
    BarChart3,
    ShieldCheck,
    HelpCircle,
    ArrowRight
} from 'lucide-react';

interface LandingPageProps {
    onNavigate: (view: View) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const menuItems = [
        { name: 'Início', href: '#home' },
        { name: 'Recursos', href: '#features' },
        { name: 'Planos', href: '#pricing' },
        { name: 'Depoimentos', href: '#testimonials' },
        { name: 'Contato', href: '#contact' },
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-background-dark text-slate-900 dark:text-white selection:bg-primary selection:text-white overflow-x-hidden">
            {/* Navbar */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-background-dark/80 backdrop-blur-md shadow-lg py-3' : 'bg-transparent py-5'
                }`}>
                <div className="container mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                            <span className="material-symbols-outlined text-white text-2xl">local_hospital</span>
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Med<span className="text-primary">Studium</span>
                        </span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        {menuItems.map((item) => (
                            <a
                                key={item.name}
                                href={item.href}
                                className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
                            >
                                {item.name}
                            </a>
                        ))}
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        <button
                            onClick={() => onNavigate(View.LOGIN)}
                            className="text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-primary transition-colors px-4 py-2"
                        >
                            Login
                        </button>
                        <button
                            onClick={() => onNavigate(View.SIGNUP)}
                            className="bg-primary hover:bg-primary-dark text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-primary/25 hover:-translate-y-0.5"
                        >
                            Cadastre-se
                        </button>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="absolute top-full left-0 right-0 bg-white dark:bg-background-dark border-t dark:border-border-dark md:hidden animate-in slide-in-from-top duration-300">
                        <div className="flex flex-col p-6 gap-4">
                            {menuItems.map((item) => (
                                <a
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="text-lg font-medium text-slate-600 dark:text-slate-300"
                                >
                                    {item.name}
                                </a>
                            ))}
                            <hr className="dark:border-border-dark" />
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => onNavigate(View.LOGIN)}
                                    className="w-full py-3 text-center font-bold text-slate-700 dark:text-slate-200"
                                >
                                    Login
                                </button>
                                <button
                                    onClick={() => onNavigate(View.SIGNUP)}
                                    className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25"
                                >
                                    Cadastre-se
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section id="home" className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                {/* Background blobs */}
                <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 size-[500px] bg-primary/5 rounded-full blur-3xl -z-10"></div>
                <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 size-[400px] bg-blue-500/5 rounded-full blur-3xl -z-10"></div>

                <div className="container mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold mb-8 animate-bounce">
                        <span className="size-2 bg-primary rounded-full animate-pulse"></span>
                        Revolucione sua forma de estudar medicina
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
                        Domine a Medicina com <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                            Estudo Inteligente
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                        A plataforma completa para organizar sua rotina, otimizar sua retenção com SRS e garantir sua aprovação na residência médica.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => onNavigate(View.SIGNUP)}
                            className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-primary/30 hover:-translate-y-1 flex items-center justify-center gap-2 group"
                        >
                            Começar Agora Grátis
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-surface-dark text-slate-900 dark:text-white border border-slate-200 dark:border-border-dark rounded-2xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-surface-highlight transition-all"
                        >
                            Ver Demonstração
                        </button>
                    </div>

                    {/* Device Mockup */}
                    <div className="mt-20 relative max-w-5xl mx-auto">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-white dark:bg-surface-dark rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-border-dark">
                            <div className="flex items-center gap-2 p-4 border-b dark:border-border-dark bg-slate-50 dark:bg-surface-highlight/50">
                                <div className="flex gap-1.5">
                                    <div className="size-3 rounded-full bg-red-400"></div>
                                    <div className="size-3 rounded-full bg-yellow-400"></div>
                                    <div className="size-3 rounded-full bg-green-400"></div>
                                </div>
                                <div className="mx-auto bg-white dark:bg-background-dark px-4 py-1 rounded-lg border dark:border-border-dark text-[10px] text-slate-400 font-medium">
                                    app.medstudium.com.br
                                </div>
                            </div>
                            <img
                                src="https://images.unsplash.com/photo-1576091160550-217359f42f8c?auto=format&fit=crop&q=80&w=2070"
                                alt="MedStudium Dashboard"
                                className="w-full h-auto object-cover aspect-video opacity-80"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 via-transparent to-transparent flex items-center justify-center">
                                <div className="size-20 rounded-full bg-primary/90 text-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-2xl">
                                    <span className="material-symbols-outlined text-4xl filled">play_arrow</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem & Solution */}
            <section className="py-24 bg-slate-50 dark:bg-surface-dark/30">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
                                O desafio de estudar medicina é <span className="text-red-500 underline decoration-red-500/30">esmagador</span>.
                            </h2>
                            <div className="space-y-6">
                                {[
                                    { icon: 'warning', title: 'Volume infinito de conteúdo', desc: 'São centenas de temas, diretrizes e atualizações constantes que parecem impossíveis de acompanhar.' },
                                    { icon: 'running_with_errors', title: 'Curva de esquecimento', desc: 'O que você estuda hoje, desaparece em uma semana se não houver revisão sistemática.' },
                                    { icon: 'event_busy', title: 'Falta de organização', desc: 'Perder tempo decidindo o que estudar é tão cansativo quanto o estudo em si.' },
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="shrink-0 size-12 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-red-500">{item.icon}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                                            <p className="text-slate-600 dark:text-slate-400">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-2xl"></div>
                            <div className="relative bg-white dark:bg-background-dark p-8 rounded-3xl border border-slate-200 dark:border-border-dark shadow-xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-500 text-sm font-bold mb-6">
                                    <CheckCircle2 size={16} />
                                    A Solução MedStudium
                                </div>
                                <h3 className="text-2xl font-bold mb-4">Nós fazemos o trabalho pesado por você.</h3>
                                <p className="text-slate-600 dark:text-slate-400 mb-8">
                                    Nossa inteligência organiza seu cronograma baseado na sua meta, calcula suas revisões e foca onde você realmente precisa melhorar.
                                </p>
                                <ul className="space-y-4">
                                    {[
                                        'Cronograma automatizado personalizado',
                                        'Sistema de Repetição Espaçada (SRS)',
                                        'Análises de desempenho em tempo real',
                                        'Foco em retenção de longo prazo'
                                    ].map((text, i) => (
                                        <li key={i} className="flex items-center gap-3 font-medium">
                                            <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                <CheckCircle2 size={14} className="text-primary" />
                                            </div>
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits */}
            <section id="features" className="py-24">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-4xl font-bold mb-4 tracking-tight">Tudo o que você precisa para a <span className="text-primary">excelência acadêmica</span></h2>
                        <p className="text-slate-600 dark:text-slate-400 font-medium">Diga adeus às planilhas e métodos de estudo ineficientes.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Zap className="text-yellow-500" />,
                                title: 'Meta de Estudo Diária',
                                desc: 'Saiba exatamente o que fazer todo dia. Sem procrastinação, apenas progresso direcionado.'
                            },
                            {
                                icon: <BookOpen className="text-blue-500" />,
                                title: 'Organização por Áreas',
                                desc: 'Divida seus estudos por grandes áreas da medicina: Clínica, Cirurgia, Pediatria e muito mais.'
                            },
                            {
                                icon: <Clock className="text-primary" />,
                                title: 'SRS Inteligente',
                                desc: 'Nossa repetição espaçada é calibrada para o seu ritmo, garantindo o máximo de retenção com o mínimo de esforço.'
                            },
                            {
                                icon: <BarChart3 className="text-green-500" />,
                                title: 'Análise de Desempenho',
                                desc: 'Identifique seus pontos cegos com gráficos detalhados de evolução por matéria e retenção.'
                            },
                            {
                                icon: <Search className="text-purple-500" />,
                                title: 'Foco na Residência',
                                desc: 'Métricas focadas no que realmente cai nas provas mais concorridas do Brasil.'
                            },
                            {
                                icon: <ShieldCheck className="text-red-500" />,
                                title: 'Segurança de Dados',
                                desc: 'Seus dados sincronizados em tempo real em todos os seus dispositivos com segurança total.'
                            },
                        ].map((feature, i) => (
                            <div key={i} className="group p-8 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-3xl hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5">
                                <div className="size-14 rounded-2xl bg-slate-50 dark:bg-background-dark flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section id="testimonials" className="py-24 bg-primary/5 border-y dark:border-border-dark overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
                        <div className="max-w-2xl">
                            <div className="flex gap-1 mb-4">
                                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={20} className="fill-yellow-400 text-yellow-400" />)}
                            </div>
                            <h2 className="text-4xl font-bold tracking-tight">Aprovado por quem <span className="text-primary">vive a medicina</span></h2>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex -space-x-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="size-12 rounded-full border-4 border-white dark:border-background-dark overflow-hidden bg-slate-200">
                                        <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                                    </div>
                                ))}
                                <div className="size-12 rounded-full border-4 border-white dark:border-background-dark bg-primary flex items-center justify-center text-white text-xs font-bold">
                                    +5k
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                text: "O MedStudium mudou minha rotina. Antes eu perdia horas organizando planilhas, agora eu só abro o app e estudo. Minha retenção dobrou.",
                                author: "Dra. Carolina Mendes",
                                role: "Residente em Clínica Médica",
                                img: "https://i.pravatar.cc/100?img=32"
                            },
                            {
                                text: "O sistema de revisões (SRS) é surreal. Temas que eu sempre esquecia agora estão fixos na memória. Indispensável para quem quer passar.",
                                author: "Gabriel Santos",
                                role: "Estudante do 6º Ano",
                                img: "https://i.pravatar.cc/100?img=12"
                            },
                            {
                                text: "Interface limpa e objetiva. Diferente de outros apps que são poluidos e confusos. Foca no que importa: aprender e fixar o conteúdo.",
                                author: "Dr. Ricardo Oliveira",
                                role: "Médico Generalista",
                                img: "https://i.pravatar.cc/100?img=53"
                            }
                        ].map((testimonial, i) => (
                            <div key={i} className="bg-white dark:bg-background-dark p-8 rounded-3xl shadow-sm border dark:border-border-dark hover:-translate-y-2 transition-transform">
                                <p className="text-slate-600 dark:text-slate-400 italic mb-8 leading-relaxed">
                                    "{testimonial.text}"
                                </p>
                                <div className="flex items-center gap-4">
                                    <img src={testimonial.img} alt={testimonial.author} className="size-12 rounded-full object-cover" />
                                    <div>
                                        <h4 className="font-bold">{testimonial.author}</h4>
                                        <p className="text-sm text-slate-500">{testimonial.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-4xl font-bold mb-4 tracking-tight">O plano perfeito para sua <span className="text-primary">jornada</span></h2>
                        <p className="text-slate-600 dark:text-slate-400 font-medium whitespace-pre-line">
                            Escolha o nível de suporte que você precisa para chegar ao topo.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {/* Free Plan */}
                        <div className="p-8 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-3xl flex flex-col hover:shadow-xl transition-all">
                            <h3 className="text-xl font-bold mb-2">Iniciante</h3>
                            <div className="mb-6">
                                <span className="text-4xl font-black">Grátis</span>
                            </div>
                            <p className="text-slate-500 text-sm mb-8">Para quem está começando a organizar os estudos.</p>
                            <ul className="space-y-4 mb-10 flex-1">
                                {['Até 10 temas ativos', 'SRS Básico', 'Dashboard diário', 'Suporte via Comunidade'].map((f, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                                        <CheckCircle2 size={16} className="text-slate-400" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => onNavigate(View.SIGNUP)}
                                className="w-full py-4 bg-slate-100 dark:bg-background-dark text-slate-900 dark:text-white rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-surface-highlight transition-all"
                            >
                                Começar Agora
                            </button>
                        </div>

                        {/* Monthly Plan */}
                        <div className="p-8 bg-white dark:bg-surface-dark border-2 border-primary rounded-3xl flex flex-col relative shadow-2xl shadow-primary/10 scale-105 z-10">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                                Mais Popular
                            </div>
                            <h3 className="text-xl font-bold mb-2">Premium Mensal</h3>
                            <div className="mb-6 flex items-baseline gap-1">
                                <span className="text-slate-500 text-lg font-bold">R$</span>
                                <span className="text-5xl font-black">29</span>
                                <span className="text-slate-500 font-bold">,90/mês</span>
                            </div>
                            <p className="text-slate-500 text-sm mb-8">O poder total para sua aprovação com flexibilidade.</p>
                            <ul className="space-y-4 mb-10 flex-1">
                                {[
                                    'Temas ilimitados',
                                    'SRS Avançado com IA',
                                    'Analytics Completo',
                                    'Modo Foco Deep Work',
                                    'Sincronização em Nuvem',
                                    'Suporte Prioritário'
                                ].map((f, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm font-bold">
                                        <CheckCircle2 size={18} className="text-primary" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => onNavigate(View.SIGNUP)}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/30 hover:bg-primary-dark transition-all hover:-translate-y-1"
                            >
                                Assinar Premium
                            </button>
                        </div>

                        {/* Lifetime Plan */}
                        <div className="p-8 bg-slate-900 text-white rounded-3xl flex flex-col hover:shadow-xl transition-all border border-slate-800">
                            <h3 className="text-xl font-bold mb-2">Lifetime Access</h3>
                            <div className="mb-6 flex items-baseline gap-1">
                                <span className="text-slate-400 text-lg font-bold">R$</span>
                                <span className="text-5xl font-black text-white">237</span>
                                <span className="text-slate-400 font-bold">,90</span>
                            </div>
                            <p className="text-slate-400 text-sm mb-8 text-balance">Pagamento único para acesso vitalício a todas as atualizações.</p>
                            <ul className="space-y-4 mb-10 flex-1">
                                {[
                                    'Tudo do Premium Mensal',
                                    'Sem mensalidades recorrentes',
                                    'Acesso Vitalício',
                                    'Novos recursos inclusos',
                                    'Bônus: Guia de Estudos'
                                ].map((f, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-300">
                                        <CheckCircle2 size={16} className="text-emerald-400" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => onNavigate(View.SIGNUP)}
                                className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold hover:bg-slate-200 transition-all border-none"
                            >
                                Aproveitar Oferta
                            </button>
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <div className="inline-flex items-center gap-2 text-slate-500 font-medium">
                            <Users size={18} />
                            Junte-se a mais de 5.000 estudantes de medicina
                        </div>
                    </div>
                </div>
            </section>

            {/* Guarantee Section */}
            <section className="py-20 bg-slate-50 dark:bg-surface-dark/50">
                <div className="container mx-auto px-6 max-w-4xl">
                    <div className="bg-white dark:bg-background-dark p-10 md:p-16 rounded-[40px] border dark:border-border-dark flex flex-col md:flex-row items-center gap-12 text-center md:text-left shadow-lg">
                        <div className="size-32 shrink-0 bg-primary/10 rounded-full flex items-center justify-center relative">
                            <span className="material-symbols-outlined text-primary text-6xl filled">verified_user</span>
                            <div className="absolute -bottom-2 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">7 Dias</div>
                        </div>
                        <div>
                            <h2 className="text-3xl font-extrabold mb-4">Garantia Incondicional de 7 Dias</h2>
                            <p className="text-slate-600 dark:text-slate-400 text-lg mb-6 leading-relaxed">
                                Teste a plataforma completa por 7 dias. Se você não sentir que seus estudos estão mais organizados e eficientes, devolvemos 100% do seu investimento sem perguntas.
                            </p>
                            <div className="flex items-center gap-2 text-primary font-bold">
                                <CheckCircle2 size={20} />
                                Risco Zero para você.
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-24">
                <div className="container mx-auto px-6 max-w-3xl">
                    <div className="text-center mb-16">
                        <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary">
                            <HelpCircle size={28} />
                        </div>
                        <h2 className="text-4xl font-extrabold mb-4">Perguntas Frequentes</h2>
                        <p className="text-slate-600 dark:text-slate-400">Tire suas dúvidas e comece hoje mesmo.</p>
                    </div>

                    <div className="space-y-4">
                        {[
                            { q: 'O que é o SRS do MedStudium?', a: 'SRS significa Spaced Repetition System. Nosso algoritmo calcula os intervalos ideais para você revisar cada tema baseado no seu desempenho, garantindo que o conhecimento vá para a memória de longo prazo.' },
                            { q: 'Posso usar no celular e no computador?', a: 'Sim! O MedStudium é 100% responsivo e funciona perfeitamente em smartphones, tablets e desktops.' },
                            { q: 'E se eu quiser cancelar?', a: 'No plano mensal, você pode cancelar a qualquer momento sem multas através do painel de gerenciamento.' },
                            { q: 'O que acontece quando atinjo o limite de temas grátis?', a: 'Você continuará tendo acesso aos temas já criados, mas precisará migrar para o Premium para adicionar novos temas e continuar evoluindo.' },
                            { q: 'Como funciona o suporte?', a: 'Usuários Premium têm suporte prioritário via chat/email. Usuários do plano gratuito contam com nossa base de conhecimento e comunidade.' }
                        ].map((faq, i) => (
                            <details key={i} className="group bg-white dark:bg-surface-dark rounded-2xl border dark:border-border-dark overflow-hidden">
                                <summary className="p-6 cursor-pointer list-none flex items-center justify-between font-bold text-lg select-none">
                                    {faq.q}
                                    <ChevronRight size={20} className="group-open:rotate-90 transition-transform text-primary" />
                                </summary>
                                <div className="px-6 pb-6 text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {faq.a}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-primary -z-10"></div>
                <div className="absolute top-0 left-0 w-full h-full opacity-10 -z-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>

                <div className="container mx-auto px-6 text-center text-white">
                    <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">Chega de estudar sem rumo. <br /> Retome o controle hoje.</h2>
                    <p className="text-xl text-white/80 max-w-2xl mx-auto mb-12 font-medium">
                        Junte-se a milhares de estudantes que já transformaram seus estudos com o MedStudium.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button
                            onClick={() => onNavigate(View.SIGNUP)}
                            className="w-full sm:w-auto px-10 py-5 bg-white text-primary rounded-2xl font-black text-xl hover:bg-slate-100 transition-all shadow-2xl hover:-translate-y-1"
                        >
                            Criar Minha Conta Grátis
                        </button>
                        <div className="flex items-center gap-2 text-white/90 font-bold">
                            <CheckCircle2 size={24} />
                            Sem cartão de crédito necessário
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer id="contact" className="bg-slate-50 dark:bg-background-dark pt-20 pb-10 border-t dark:border-border-dark">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
                        <div className="col-span-2 lg:col-span-2">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-xl">local_hospital</span>
                                </div>
                                <span className="text-xl font-black tracking-tight dark:text-white">
                                    Med<span className="text-primary">Studium</span>
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-8 font-medium">
                                Organizando e potencializando o estudo médico para as provas de residência mais concorridas do país.
                            </p>
                            <div className="flex gap-4">
                                {['facebook', 'instagram', 'twitter', 'linkedin'].map(social => (
                                    <div key={social} className="size-10 rounded-full border dark:border-border-dark flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all cursor-pointer">
                                        <span className="material-symbols-outlined text-xl">{social}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="font-black mb-6 uppercase text-xs tracking-widest text-slate-400">Produto</h4>
                            <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-bold text-sm">
                                <li><a href="#home" className="hover:text-primary transition-colors">Início</a></li>
                                <li><a href="#features" className="hover:text-primary transition-colors">Funcionalidades</a></li>
                                <li><a href="#pricing" className="hover:text-primary transition-colors">Preços</a></li>
                                <li><a href="#testimonials" className="hover:text-primary transition-colors">Depoimentos</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-black mb-6 uppercase text-xs tracking-widest text-slate-400">Suporte</h4>
                            <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-bold text-sm">
                                <li><a href="#" className="hover:text-primary transition-colors">Central de Ajuda</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Contato</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Status</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-black mb-6 uppercase text-xs tracking-widest text-slate-400">Legal</h4>
                            <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-bold text-sm">
                                <li><a href="#" className="hover:text-primary transition-colors">Privacidade</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Termos de Uso</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Cookies</a></li>
                            </ul>
                        </div>
                    </div>

                    <hr className="dark:border-border-dark mb-10" />

                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500 text-sm font-medium">
                        <p>© 2026 MedStudium. Desenvolvido para o futuro da medicina.</p>
                        <div className="flex gap-4 items-center">
                            <span>Feito com</span>
                            <span className="material-symbols-outlined text-red-500 filled text-sm">favorite</span>
                            <span>no Brasil</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
