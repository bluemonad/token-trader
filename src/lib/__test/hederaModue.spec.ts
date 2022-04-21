// import * as Hedera from "../hederaModule";

const emmaAccount = process.env.EMMA;
const emmaPKStr = process.env.EMMA_PK;

describe("test Hedera create client", () => {
    it("test env", () => {
        expect(process.env.EMMA).toBe("0.0.29661640");
    })
})
