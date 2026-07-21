import { describe, expect, it } from 'vitest';
import { exportIob2 } from '../lib/export';
import { parseXmlCorpus, serializeProjectXml } from '../lib/xml';

const SAMPLE_XML = `<DOC>
  <Sentence ID="1">
    <W>तो</W>
    <NUMEX ID="31" TYPE="QUANTITY"><W>रंगाचे,</W><W>२०-४०</W><W>सेमी</W></NUMEX>
    <W>लांब</W>
    <W>होता</W>
    <W>.</W>
  </Sentence>
</DOC>`;

describe('XML round-trip', () => {
  it('parses and serializes a legacy corpus without losing sentences', () => {
    const project = parseXmlCorpus(SAMPLE_XML, 'sample.xml');
    expect(project.sentences).toHaveLength(1);
    expect(project.annotations).toHaveProperty('31');
    const output = serializeProjectXml(project);
    expect(output).toContain('<Sentence ID="1">');
    expect(output).toContain('<NUMEX ID="31" TYPE="QUANTITY">');
  });

  it('exports IOB2 labels', () => {
    const project = parseXmlCorpus(SAMPLE_XML, 'sample.xml');
    const iob2 = exportIob2(project);
    expect(iob2).toContain('तो\tO');
    expect(iob2).toContain('रंगाचे,\tB-QUANTITY');
  });
});