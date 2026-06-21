'use strict';

class HealthController {
  async check(ctx) {
    ctx.body = {
      ok: true,
      service: 'zentao-user-register',
    };
  }
}

module.exports = new HealthController();
