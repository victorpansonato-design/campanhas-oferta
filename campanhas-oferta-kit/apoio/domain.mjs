// Referência de domínio local, sem acesso a rede ou a sistemas institucionais.
const formats = {Presencial:'Presencial',Semipresencial:'Híbrido','Presencial Intensivo':'Híbrido',EAD:'EAD'};
export function modalidadeParaFormato(formato) {
  return formats[formato] ?? null;
}
export function normalizeSearch(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}
export function gerarEntradas(ano, modalidade) {
  if (!Number.isInteger(ano) || ano < 2000 || ano > 9999) throw new Error('Ano inválido');
  const suffixes = {Presencial:[1,2],'Híbrido':[21,22,23,24],EAD:[71,72,73,74]}[modalidade];
  if (!suffixes) throw new Error('Modalidade inválida');
  const span = modalidade === 'Presencial' ? 6 : 3;
  return suffixes.map((suffix,index)=> {
    const month = index*span+1;
    const endMonth = month+span-1;
    const lastDay = new Date(Date.UTC(ano,endMonth,0)).getUTCDate();
    return {codigo:`${ano}/${suffix}`,ano,modalidade,inicio:`${ano}-${String(month).padStart(2,'0')}-01`,fim:`${ano}-${String(endMonth).padStart(2,'0')}-${lastDay}`};
  });
}
function monthIndex(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Competência inválida');
  const [year,m] = month.split('-').map(Number);
  return year*12+m-1;
}
export function listarMeses(inicio,fim) {
  const a = monthIndex(inicio), b = monthIndex(fim);
  if (b < a) throw new Error('Intervalo invertido');
  if (b-a > 120) throw new Error('Horizonte acima de 121 meses');
  return Array.from({length:b-a+1},(_,i)=> {
    const n = a+i;
    return `${Math.floor(n/12)}-${String(n%12+1).padStart(2,'0')}`;
  });
}
export function parseBRL(value) {
  if (typeof value !== 'string') throw new Error('Valor deve ser texto pt-BR');
  const raw = value.trim().replace(/^R\$\s*/, '');
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw)) throw new Error('Valor inválido');
  const [whole,decimals=''] = raw.replace(/\./g,'').split(',');
  const result = Number(whole)*100+Number(decimals.padEnd(2,'0'));
  if (!Number.isSafeInteger(result)) throw new Error('Valor fora de limite');
  return result;
}
export function valorDaRegra(rule,baseCentavos) {
  if (rule.tipo === 'isencao') return 0;
  if (rule.tipo === 'fixo') {
    if (!Number.isSafeInteger(rule.valorCentavos) || rule.valorCentavos < 0) throw new Error('Valor inválido');
    return rule.valorCentavos;
  }
  if (rule.tipo === 'base' || rule.tipo === 'percentual') {
    if (!Number.isSafeInteger(baseCentavos) || baseCentavos < 0) throw new Error('Base obrigatória');
    if (rule.tipo === 'base') return baseCentavos;
    if (!Number.isInteger(rule.percentualBps) || rule.percentualBps < 0 || rule.percentualBps > 10000) throw new Error('Percentual inválido');
    return Math.round(baseCentavos*(10000-rule.percentualBps)/10000);
  }
  throw new Error('Tipo de regra inválido');
}
export function cronograma(horizonte,regras,baseCentavos) {
  for (const r of regras) listarMeses(r.inicio,r.fim);
  const meses = listarMeses(horizonte.inicio,horizonte.fim);
  return meses.map(competencia=> {
    const hits = regras.filter(r=>r.inicio <= competencia && r.fim >= competencia);
    if (hits.length > 1) throw new Error(`Regras sobrepostas em ${competencia}`);
    if (!hits.length) return {competencia,valorCentavos:null,estado:'nao-definido'};
    return {competencia,valorCentavos:valorDaRegra(hits[0],baseCentavos),estado:hits[0].tipo === 'isencao'?'isento':'definido'};
  });
}
export function intervalosCruzam(a,b) {
  return a.inicio <= b.fim && b.inicio <= a.fim;
}
// Para conflito, use janela resolvida a partir das entradas quando janelaMatricula=null.
// Revisões do mesmo id devem ser resolvidas separadamente como substituição versionada.
export function revisoesConflitam(a,b,janelaA,janelaB) {
  const shared = a.contextosIds.filter(id=>b.contextosIds.includes(id));
  return shared.length > 0 && intervalosCruzam(janelaA,janelaB) && a.regras.some(x=>b.regras.some(y=>intervalosCruzam(x,y)));
}
