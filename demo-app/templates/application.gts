import { pageTitle } from 'ember-page-title';
import { LinkTo } from '@ember/routing';
import { variation } from 'ember-launch-darkly';

<template>
  {{pageTitle "Launch Darkly Demo"}}

  <h1>Ember Launch Darkly Demo</h1>

  <nav>
    <LinkTo @route="index">Home</LinkTo>
    |
    <LinkTo @route="identified-user">Identify User</LinkTo>
    |
    <LinkTo @route="streaming-flags">Streaming Flags</LinkTo>
  </nav>

  <h2>All Flags</h2>
  <ul>
    <li>shape: {{variation "shape"}}</li>
    <li>shape-background-color: {{variation "shape-background-color"}}</li>
    <li>make-shape-blink:
      {{if (variation "make-shape-blink") "true" "false"}}</li>
  </ul>

  <hr />

  {{outlet}}
</template>
