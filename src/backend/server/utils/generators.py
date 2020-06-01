import yaml
import ast
from urllib.parse import unquote
#from anytree import Node, AnyNode, RenderTree

from .utils import generate_uuid


class RevereseGenerator():
    def __init__(self, yaml_str, canvas_lookup_by_s_name=None, canvas_lookup_by_s_uuid=None):
        self.yaml_str = yaml_str
        self.canvas_lookup_by_s_name = canvas_lookup_by_s_name
        self.canvas_lookup_by_s_uuid = canvas_lookup_by_s_uuid
        self.service_uuid_lookup = {}
        self.volume_uuid_lookup = {}
        self.network_uuid_lookup = {}
        self.initial_top = 130
        self.initial_left = 200
        self.services_counter = 0
        self.canvas_obj = {
            "top": 512,
            "left": 434,
            "uuid": "",
            "zoomLevel": 1
        }
        self.volume_obj = {
            "name": "",
            "volume_name": "",
            "uuid": "",
            "driver": None,
            "labels": [],
            "external": False,
            "driver_opts": None,
            "external_name": None
        }
        self.network_obj = {
            "name": "",
            "object_name": "",
            "uuid": "",
            "driver": "local",
            "labels": [],
            "external": False,
            "driver_opts": [],
            "network_name": "",
            "external_name": None
        }
        self.build_obj = {
            "context": "",
            "dockerfile": "",
            "args": [],
            "cache_from": [],
            "labels": [],
            "network": "",
            "shm_size": "",
            "target": "",
        }
        self.port_obj = {
            "published": "80",
            "target": "8080",
            "mode": "host",
            "protocol": "TCP"
        }
        self.resp = {
            'name': 'Imported project',
            'id': None,
            'date_created': None,
            'date_updated': None,
            'uuid': None,
            'data': {
                'canvas': [],
                'version': '3',
                'volumes': [],
                'networks': [],
                'services': [],
                'secrets': [],
                'configs': []
            },
            'mutable': True
        }
    
    def populate_service_lookup_table(self, services):
        for service_k, _ in services.items():
            obj_uuid = generate_uuid()
            self.service_uuid_lookup[service_k] = obj_uuid
    
    def parse_top_level_volumes(self, volumes):
        """
        Parses top level volume objects only, excluding path mounts.
        """
        if not volumes:
            return

        for volume_k, volume_v in volumes.items():
            obj_uuid = generate_uuid()
            volume_obj_cp = self.volume_obj.copy()
            volume_obj_cp['uuid'] = obj_uuid
            volume_obj_cp['name'] = volume_k

            try:
                external = volume_v.get('external', False)

                if external:
                    external_name = external.get('name', None)

                    volume_obj_cp['external'] = True
                    volume_obj_cp['external_name'] = external_name
            except (AttributeError, KeyError):
                pass

            try:
                volume_obj_cp['volume_name'] = volume_v.get('name', None)
            except (AttributeError, KeyError):
                pass

            try:
                volume_obj_cp['driver'] = volume_v.get('driver', None)
            except (AttributeError, KeyError):
                pass

            try:
                volume_obj_cp['labels'] = []
                volume_labels = volume_v.get('labels', None)
                for lbl_key, lbl_val in volume_labels.items():
                    volume_obj_cp['labels'].append({
                        'key': lbl_key,
                        'value': lbl_val
                    })
            except (AttributeError, KeyError):
                pass

            self.volume_uuid_lookup[volume_k] = obj_uuid
            self.resp['data']['volumes'].append(volume_obj_cp)
    
    def to_key_val_pairs(self, items):
        ret = []

        if isinstance(items, list):
            for item in items:
                item_parts = item.split('=')
                ret.append({'key': item_parts[0], 'value': item_parts[1]})

        if isinstance(items, dict):
            try:
                for _key, _val in items.items():
                    ret.append({'key': _key, 'value': _val})
            except AttributeError:
                pass
        
        return ret
    
    def parse_build_obj(self, build):
        ret = self.build_obj.copy()

        if isinstance(build, str):
            ret['build'] = build
        else:
            for _key, _val in build.items():
                if _key in ['args', 'cache_from', 'labels']:
                    if _val:
                        ret[_key] = self.to_key_val_pairs(_val)
                else:
                    if _val:
                        ret[_key] = _val

        return ret

    def parse_top_level_networks(self, networks):
        if not networks:
            return

        for network_k, network_v in networks.items():
            obj_uuid = generate_uuid()
            network_obj_cp = self.network_obj.copy()
            network_obj_cp['name'] = network_k
            network_obj_cp['uuid'] = obj_uuid

            try:
                network_obj_cp['object_name'] = network_v.get('name', None)
                network_obj_cp['driver'] = network_v.get('driver', None)
                network_obj_cp['external'] = network_v.get('external', False)
            except (AttributeError, KeyError):
                pass

            try:
                network_obj_cp['labels'] = self.to_key_val_pairs(network_v['labels'])
            except Exception:
                pass

            try:
                network_obj_cp['driver_opts'] = self.to_key_val_pairs(network_v['driver_opts'])
            except Exception:
                pass

            self.network_uuid_lookup[network_k] = obj_uuid
            self.resp['data']['networks'].append(network_obj_cp)

    def yaml_dict_to_system_obj(self):
        yaml_str = unquote(self.yaml_str)
        _dict = yaml.safe_load(yaml_str)

        if not _dict:
            return self.resp

        version = _dict.get('version', '3')
        services = _dict.get('services', None)
        volumes = _dict.get('volumes', None)
        networks = _dict.get('networks', None)
        secrets = _dict.get('secrets', None)
        configs = _dict.get('configs', None)
        self.resp['data']['version'] = version

        # populate lookup tables, and parse top level objects
        self.parse_top_level_volumes(volumes)
        self.parse_top_level_networks(networks)

        if not services:
            return self.resp

        self.populate_service_lookup_table(services)

        # construct services
        for service_k, service_v in services.items():
            service_obj = {}

            # canvas object for each service object
            try:
                canvas_obj_cp = self.canvas_lookup_by_s_name[service_k]
            except KeyError:
                canvas_obj_cp = self.canvas_obj.copy()
                canvas_obj_cp['uuid'] = self.service_uuid_lookup[service_k]

            # construct service obj
            image = service_v.get('image', None)
            if image:
                image_parts = service_v['image'].split(':')
                service_obj['image'] = image_parts[0]
                
                try:
                    service_obj['tag'] = image_parts[1]
                except IndexError:
                    service_obj['tag'] = 'latest'

            service_obj['name'] = service_k
            service_obj['uuid'] = self.service_uuid_lookup[service_k]
            build = service_v.get('build', None)

            if build:
                service_obj['build'] = self.parse_build_obj(build)

            try:
                service_obj['command'] = service_v['command']
            except Exception:
                pass

            try:
                service_obj['working_dir'] = service_v['working_dir']
            except Exception:
                pass

            try:
                service_obj['environment'] = []
                envs = service_v['environment']
                if isinstance(envs, list):
                    for env_set in envs:
                        env_set_parts = env_set.split('=')
                        service_obj['environment'].append({
                            'key': env_set_parts[0],
                            'value': env_set_parts[1]
                        })
                else:
                    for env_key, env_val in service_v['environment'].items():
                        service_obj['environment'].append({
                            'key': env_key,
                            'value': env_val
                        })
            except Exception:
                pass

            try:
                service_obj['labels'] = []
                service_labels = service_v.get('labels', None)

                if isinstance(service_labels, list):
                    for label_set in service_labels:
                        label_set_parts = label_set.split('=')
                        service_obj['labels'].append({
                            'key': label_set_parts[0],
                            'value': label_set_parts[1]
                        })

                if isinstance(service_labels, dict):
                    for lbl_key, lbl_val in service_labels.items():
                        service_obj['labels'].append({
                            'key': lbl_key,
                            'value': lbl_val
                        })
            except Exception as e:
                print(e)

            try:
                service_obj['ports'] = []
                for port in service_v['ports']:
                    if isinstance(port, str):
                        port_parts = port.split(':')
                        port_obj_cp = self.port_obj.copy()
                        port_obj_cp['published'] = port_parts[0]
                        port_obj_cp['protocol'] = 'tcp'
                        port_obj_cp['mode'] = 'host'

                        try:
                            port_obj_cp['target'] = port_parts[1]
                        except IndexError:
                            port_obj_cp['target'] = None
                        
                        service_obj['ports'].append(port_obj_cp)

                    if isinstance(port, dict):
                        service_obj['ports'].append(port)

            except KeyError:
                pass

            try:
                service_obj['volumes'] = []
                for volume in service_v['volumes']:
                    volume_obj_uuid = generate_uuid()
                    volume_obj_cp = self.volume_obj.copy()
                    volume_obj_cp['uuid'] = volume_obj_uuid
                    volume_obj_cp['name'] = volume_obj_uuid

                    volume_parts = volume.split(':')

                    if len(volume_parts) > 1:
                        try:
                            volume_id = self.volume_uuid_lookup[volume_parts[0]]

                            if volume_id:
                                service_obj['volumes'].append({
                                    "volume": volume_id,
                                    "destination": volume_parts[1]
                                })
                        except KeyError:
                            service_obj['volumes'].append({
                                "relativePathSource": volume_parts[0],
                                "destination": volume_parts[1]
                            })
                    else:
                        service_obj['volumes'].append({
                            "relativePathSource": volume_parts[0],
                            "destination": volume_parts[0]
                        })

            except KeyError:
                pass

            try:
                service_obj['networks'] = []
                for network in service_v['networks']:
                    service_obj['networks'].append(self.network_uuid_lookup[network])
            except KeyError:
                pass

            try:
                service_obj['depends_on'] = []
                for dep in service_v['depends_on']:
                    service_obj['depends_on'].append(self.service_uuid_lookup[dep])
            except KeyError:
                pass

            if float(version) < 2:
                try:
                    service_obj['links'] = []
                    for dep in service_v['links']:
                        service_obj['links'].append(self.service_uuid_lookup[dep])
                except KeyError:
                    pass

            try:
                service_obj['container_name'] = service_v['container_name']
            except KeyError:
                pass

            try:
                service_obj['restart'] = service_v['restart']
            except KeyError:
                pass

            try:
                deploy = service_v['deploy']
                service_obj['deploy'] = deploy
                
                '''
                try:
                    placement_preferences = deploy['placement']['preferences']
                    service_obj['deploy']['placement']['preferences'] = self.to_key_val_pairs(placement_preferences)
                except Exception:
                    pass
                '''

                try:
                    labels = deploy['labels']
                    service_obj['deploy']['labels'] = self.to_key_val_pairs(labels)
                except Exception:
                    pass
            except KeyError:
                pass

            # append to object lists
            self.resp['data']['services'].append(service_obj)
            self.resp['data']['canvas'].append(canvas_obj_cp)
            
        levels = {}

        for parsed_service in self.resp['data']['services']:
            dep_count = len(parsed_service['depends_on'])

            try:
                levels[dep_count].append({
                    'uuid': parsed_service['uuid'],
                    'name': parsed_service['name']
                })
            except KeyError:
                levels[dep_count] = []
                levels[dep_count].append({
                    'uuid': parsed_service['uuid'],
                    'name': parsed_service['name']
                })

        canvas = []
        initial_top = 20
        initial_left = 20
        iter_node_count = 0

        for _, l_values in levels.items():
            for l_value in l_values:
                if not iter_node_count % 5:
                    initial_left = 20
                    initial_top += 200

                initial_left += 200

                try:
                    canvas_obj_cp = self.canvas_lookup_by_s_name[l_value['name']]
                    canvas_obj_cp['uuid'] = l_value['uuid']
                    canvas.append(canvas_obj_cp)
                except KeyError:
                    canvas_obj_cp = self.canvas_obj.copy()
                    canvas_obj_cp['top'] = initial_top
                    canvas_obj_cp['left'] = initial_left
                    canvas_obj_cp['uuid'] = l_value['uuid']
                    canvas_obj_cp['zoomLevel'] = 0.7
                    canvas.append(canvas_obj_cp)

                iter_node_count += 1

        self.resp['data']['canvas'] = list(reversed(canvas))

        return self.resp
