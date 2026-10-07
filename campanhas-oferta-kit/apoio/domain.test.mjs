import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gerarEntradas,modalidadeParaFormato,normalizeSearch,listarMeses,parseBRL,valorDaRegra,cronograma,revisoesConflitam} from './domain.mjs';

const read = name=>JSON.parse(readFileSync(new URL('../dados/'+name,import.meta.url),'utf8'));
const {cursos} = read('catalogo-cursos.json');
const {ofertas} = read('ofertas-catalogo.json');
const {entradas} = read('entradas.json');
const demo = read('demo.json');
const idSet = list=>new Set(list.map(x=>x.id));
const courseIds=idSet(cursos),offerIds=idSet(ofertas),contextIds=idSet(demo.contextos),studentIds=idSet(demo.matriculas);

test('Catálogo observado completo, único e com NOVO separado do estado de formação',()=>{
  assert.equal(cursos.length,82);
  assert.equal(courseIds.size,82);
  assert.equal(cursos.filter(c=>c.novo).length,30);
  assert.equal(ofertas.length,124);
  assert.equal(offerIds.size,124);
  for (const c of cursos) {
    assert.ok(c.fonteUrl.startsWith('https://anchieta.br/graduacao/'));
    assert.equal(c.imagem,null);
    assert.equal(c.lyceumCursoId,null);
    assert.ok(c.formatosPermitidos.length>0);
    assert.equal('formouTurma' in c,false);
  }
});

test('Integral excluído sem perder cursos com outro formato',()=>{
  assert.equal(ofertas.some(o=>o.formato==='Presencial Integral'),false);
  for (const id of ['biomedicina','fisioterapia','medicina-veterinaria','psicologia']) assert.ok(ofertas.some(o=>o.cursoId===id));
  assert.deepEqual(ofertas.filter(o=>o.cursoId==='enfermagem').map(o=>o.formato),['Presencial Intensivo']);
  assert.equal(modalidadeParaFormato('Presencial Intensivo'),'Híbrido');
  assert.equal(modalidadeParaFormato('Presencial Integral'),null);
});

test('Anos futuros e códigos completos por modalidade',()=>{
  assert.deepEqual(gerarEntradas(2027,'Presencial').map(e=>e.codigo),['2027/1','2027/2']);
  assert.deepEqual(gerarEntradas(2027,'Híbrido').map(e=>e.codigo),['2027/21','2027/22','2027/23','2027/24']);
  assert.deepEqual(gerarEntradas(2027,'EAD').map(e=>e.codigo),['2027/71','2027/72','2027/73','2027/74']);
  assert.equal(gerarEntradas(2028,'EAD')[3].fim,'2028-12-31');
  assert.deepEqual(gerarEntradas(2026,'Híbrido').map(e=>[e.inicio,e.fim]),[['2026-01-01','2026-03-31'],['2026-04-01','2026-06-30'],['2026-07-01','2026-09-30'],['2026-10-01','2026-12-31']]);
});

test('Valores pt-BR preservam zero e não aceitam valores ambíguos',()=>{
  assert.equal(parseBRL('R$ 1.299,90'),129990);
  assert.equal(parseBRL('0,00'),0);
  assert.equal(parseBRL('599,5'),59950);
  for (const s of ['-1,00','1.2','1,2,3','NaN','']) assert.throws(()=>parseBRL(s));
});

test('Meses atravessam anos sem deslocamento por timezone',()=>{
  assert.deepEqual(listarMeses('2026-12','2027-02'),['2026-12','2027-01','2027-02']);
  assert.deepEqual(listarMeses('2028-02','2028-02'),['2028-02']);
  assert.throws(()=>listarMeses('2027-13','2027-14'));
  assert.throws(()=>listarMeses('2027-06','2027-01'));
});

test('Janeiro isento e fevereiro–junho R$ 599 totalizam R$ 2.995',()=>{
  const r=demo.campanhas.find(c=>c.id==='camp-001').revisoes[0];
  const months=cronograma(r.horizonteCobranca,r.regras);
  assert.equal(months.length,6);
  assert.equal(months[0].estado,'isento');
  assert.equal(months[0].valorCentavos,0);
  assert.equal(months.reduce((s,x)=>s+x.valorCentavos,0),299500);
});

test('Bolsa exige base, respeita limites e arredonda parcela',()=>{
  assert.equal(valorDaRegra({tipo:'percentual',percentualBps:3000},50000),35000);
  assert.equal(valorDaRegra({tipo:'percentual',percentualBps:3333},10000),6667);
  assert.equal(valorDaRegra({tipo:'percentual',percentualBps:10000},50000),0);
  assert.throws(()=>valorDaRegra({tipo:'percentual',percentualBps:3000}));
  assert.throws(()=>valorDaRegra({tipo:'percentual',percentualBps:10001},50000));
  assert.throws(()=>valorDaRegra({tipo:'fixo',valorCentavos:-10}));
});

test('Falta de condição não vira zero e sobreposição é rejeitada',()=>{
  const horizon={inicio:'2027-01',fim:'2027-03'};
  assert.equal(cronograma(horizon,[{inicio:'2027-01',fim:'2027-01',tipo:'isencao'}])[1].valorCentavos,null);
  assert.throws(()=>cronograma(horizon,[{inicio:'2027-01',fim:'2027-02',tipo:'isencao'},{inicio:'2027-02',fim:'2027-03',tipo:'fixo',valorCentavos:100}]));
});

test('Conflito depende de contexto, adesão e competência',()=>{
  const a=demo.campanhas.find(c=>c.id==='camp-001').revisoes[0];
  const b=demo.campanhas.find(c=>c.id==='camp-005').revisoes[0];
  const window=a.elegibilidade.janelaMatricula;
  assert.equal(revisoesConflitam(a,b,window,window),true);
  assert.equal(revisoesConflitam(a,{...b,contextosIds:['outro-turno']},window,window),false);
  assert.equal(revisoesConflitam(a,b,window,{inicio:'2027-02-01',fim:'2027-02-28'}),false);
  assert.equal(revisoesConflitam(a,{...b,regras:[{inicio:'2027-07',fim:'2027-12'}]},window,window),false);
});

test('Relações entre curso, oferta, entrada, base, alunos e campanhas são válidas',()=>{
  const entryMap=new Map(entradas.map(e=>[e.codigo,e]));
  const offerMap=new Map(ofertas.map(o=>[o.id,o]));
  const contextMap=new Map(demo.contextos.map(c=>[c.id,c]));
  for (const o of ofertas) {assert.ok(courseIds.has(o.cursoId));assert.equal(modalidadeParaFormato(o.formato),o.modalidade);}
  for (const c of demo.contextos) {
    assert.ok(offerIds.has(c.ofertaId));
    assert.equal(entryMap.get(c.entradaCodigo).modalidade,offerMap.get(c.ofertaId).modalidade);
  }
  for(const b of demo.basesDemonstrativas) assert.ok(contextIds.has(b.contextoId));
  for(const m of demo.matriculas) {assert.ok(contextIds.has(m.contextoId));assert.equal(typeof m.ra,'string');assert.equal(m.ficticio,true);}
  for(const c of demo.campanhas) {
    for(const r of c.revisoes) {
      for(const id of r.contextosIds) {
        assert.ok(contextIds.has(id));
        assert.ok(r.elegibilidade.entradasCodigos.includes(contextMap.get(id).entradaCodigo));
      }
      if(r.decisao) assert.ok(new Date(r.decisao.em)>=new Date(r.criadaEm));
    }
    if(c.arquivadaEm) assert.ok(new Date(c.arquivadaEm)>=new Date(c.criadaEm));
  }
});

test('Não formação lista 32 alunos somente em seus quatro contextos',()=>{
  const records=demo.naoFormacao.filter(r=>r.estado==='nao-formou');
  assert.equal(records.length,4);
  assert.equal(records.reduce((s,r)=>s+r.alunosIds.length,0),32);
  for(const r of records) {
    assert.ok(contextIds.has(r.contextoId));
    const actual=demo.matriculas.filter(m=>m.contextoId===r.contextoId).map(m=>m.id).sort();
    assert.deepEqual([...r.alunosIds].sort(),actual);
    for(const id of r.alunosIds) assert.ok(studentIds.has(id));
  }
  const banco=records.find(r=>r.contextoId.includes('banco-de-dados'));
  assert.ok(demo.contextos.some(c=>c.ofertaId==='banco-de-dados__presencial' && c.entradaCodigo==='2027/1' && c.id!==banco.contextoId));
  assert.ok(demo.contextos.some(c=>c.ofertaId==='banco-de-dados__presencial' && c.entradaCodigo==='2027/2'));
});

test('Oferta na matrícula mantém revisão anterior e valores congelados',()=>{
  const snapshot=structuredClone(demo.matriculas.find(m=>m.campanhaVinculada).campanhaVinculada);
  const current=demo.campanhas.find(c=>c.id===snapshot.campanhaId).revisoes.at(-1);
  const before=JSON.stringify(snapshot);
  assert.equal(snapshot.revisaoNumero,1);
  assert.equal(current.numero,2);
  assert.equal(current.estado,'em-aprovacao');
  assert.equal(snapshot.parcelas[1].valorCentavos,59900);
  assert.equal(cronograma(current.horizonteCobranca,current.regras)[1].valorCentavos,54900);
  assert.equal(JSON.stringify(snapshot),before);
});

test('Contato mock não aponta para pessoas reais e busca ignora acentos',()=>{
  for(const m of demo.matriculas) if(m.email) assert.ok(m.email.endsWith('@example.invalid'));
  for(const p of demo.personas) assert.ok(p.email.endsWith('@example.invalid'));
  assert.equal(normalizeSearch('  HÍBRIDO Administração '),'hibrido administracao');
});
