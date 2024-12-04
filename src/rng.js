export class RNG {
    m_w = 123456789;
    m_z = 987654321;
    mask = 0xFFFFFFFF;

    constructor(seed) {
        this.m_w = (123456789 + seed) & this.mask;
        this.m_z = (987654321 - seed) & this.mask;
    }
}