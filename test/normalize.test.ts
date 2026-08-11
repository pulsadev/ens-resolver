import { describe, it, expect } from 'vitest'
import { ensNormalize } from '../src/utils/normalize.js'

describe('ensNormalize', () => {
  it('lowercases ASCII', () => {
    expect(ensNormalize('Vitalik.ETH')).toBe('vitalik.eth')
    expect(ensNormalize('NICK.eth')).toBe('nick.eth')
  })

  it('maps German sharp-s to ss', () => {
    expect(ensNormalize('faß.eth')).toBe('fass.eth')
    expect(ensNormalize('straße.eth')).toBe('strasse.eth')
  })

  it('maps fullwidth ASCII to normal', () => {
    expect(ensNormalize('Ａ.eth')).toBe('a.eth')
    expect(ensNormalize('ＡＢＣ.eth')).toBe('abc.eth')
    expect(ensNormalize('１２３.eth')).toBe('123.eth')
  })

  it('strips zero-width characters', () => {
    expect(ensNormalize('vita​lik.eth')).toBe('vitalik.eth')
    expect(ensNormalize('vita‌lik.eth')).toBe('vitalik.eth')
    expect(ensNormalize('vita‍lik.eth')).toBe('vitalik.eth')
    expect(ensNormalize('﻿vitalik.eth')).toBe('vitalik.eth')
  })

  it('strips soft hyphen', () => {
    expect(ensNormalize('vita­lik.eth')).toBe('vitalik.eth')
  })

  it('applies NFC normalization', () => {
    // é as e + combining acute (NFD) should become é (NFC)
    const nfd = 'é.eth'
    const nfc = 'é.eth'
    expect(ensNormalize(nfd)).toBe(nfc)
  })

  it('passes through emoji unchanged', () => {
    expect(ensNormalize('🦊.eth')).toBe('🦊.eth')
    expect(ensNormalize('💎🙌.eth')).toBe('💎🙌.eth')
  })

  it('passes through CJK characters', () => {
    expect(ensNormalize('中文.eth')).toBe('中文.eth')
  })

  it('rejects labels starting with hyphen', () => {
    expect(() => ensNormalize('-bad.eth')).toThrow('starts or ends with hyphen')
  })

  it('rejects labels ending with hyphen', () => {
    expect(() => ensNormalize('bad-.eth')).toThrow('starts or ends with hyphen')
  })

  it('rejects labels starting with combining mark', () => {
    expect(() => ensNormalize('̀test.eth')).toThrow('starts with combining mark')
  })

  it('allows hyphens in middle', () => {
    expect(ensNormalize('my-name.eth')).toBe('my-name.eth')
  })

  it('handles greek final sigma', () => {
    expect(ensNormalize('ς.eth')).toBe('σ.eth')
  })

  it('handles normal ASCII names without changes', () => {
    expect(ensNormalize('vitalik.eth')).toBe('vitalik.eth')
    expect(ensNormalize('nick.eth')).toBe('nick.eth')
    expect(ensNormalize('abc123.eth')).toBe('abc123.eth')
  })
})
