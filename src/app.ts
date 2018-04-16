import * as path from 'path';
import * as cors from 'cors';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import { Express, Request, Response, NextFunction } from 'express';

import { hb } from './hb';
import { AuthMiddleware } from './auth';
import { UserRouter } from './routes/users';
import { LoginRouter } from './routes/login';
import { SettingsRouter } from './routes/settings';
import { ServerRouter } from './routes/server';
import { ConfigRouter } from './routes/config';
import { PackageRouter } from './routes/packages';
import { AccessoriesRouter } from './routes/accessories';
import { PlatformToolsRouter } from './routes/platform-tools';

export class ExpressServer {
  public app: Express;
  private auth;

  constructor() {
    this.auth = new AuthMiddleware();

    this.app = <Express>express();

    // authentication middleware
    this.app.use(this.auth.init);

    // load angular spa
    this.app.get('/', this.auth.staticAuth, this.serveSpa);

    // login page image
    this.app.use('/assets/snapshot.jpg', (req, res, next) => {
      if (hb.loginWallpaper) {
        res.sendFile(path.resolve(hb.loginWallpaper));
      } else {
        res.sendFile(path.resolve(__dirname, '../public/assets/snapshot.jpg'));
      }
    });

    // static assets
    this.app.use(express.static(path.resolve(__dirname, '../public')));

    // enable cors for development using ng serve
    this.app.use(cors({
      origin: ['http://localhost:4200'],
      credentials: true
    }));

    // json post handler
    this.app.use(bodyParser.json());

    this.app.use('/api/login', new LoginRouter().router);
    this.app.use('/api/settings', new SettingsRouter().router);

    // force authentication on all other /api routes
    this.app.use('/api', this.auth.main);

    // authenticated routes
    this.app.use('/api/server', new ServerRouter().router);
    this.app.use('/api/users', new UserRouter().router);
    this.app.use('/api/packages', new PackageRouter().router);
    this.app.use('/api/config', new ConfigRouter().router);
    this.app.use('/api/accessories', new AccessoriesRouter().router);

    // platform tools router
    this.app.use('/api', new PlatformToolsRouter().router);

    // serve index.html for anything not on the /api routes
    this.app.get(/^((?!api\/).)*$/, this.auth.staticAuth, this.serveSpa);

    // 404 handler
    this.app.use(this.notFound);

    // error handler
    this.app.use(this.errorHandler);

  }

  serveSpa(req: Request, res: Response, next: NextFunction) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.resolve(__dirname, '../public/index.html'), { etag: false });
  }

  notFound(req: Request, res: Response, next: NextFunction) {
    res.sendStatus(404);
  }

  errorHandler(err, req: Request, res: Response, next: NextFunction) {
    hb.error(err);

    if (res.statusCode === 200) {
      res.status(500);
    }

    res.json({
      error: err,
      message: err.message
    });
  }
}
